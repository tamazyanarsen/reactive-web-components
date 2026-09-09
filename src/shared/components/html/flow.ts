import { onDispose, signal, untracked, type ReadonlySignal } from "../../signals";
import { createEffectScope, hostEffect, type EffectScope } from "../utils/render-context";
import { appendChildren, type ElementChild } from "./html-element";

/** Что могут вернуть ветка when и рендер элемента списка. */
export type FlowContent = ElementChild | readonly ElementChild[] | null | undefined;

/**
 * Собирает содержимое во фрагмент общим путём для детей: строки станут Text,
 * реактивные источники — реактивным Text, пустые значения не оставят следов.
 */
export const buildFragment = (content: FlowContent): DocumentFragment => {
  const fragment = document.createDocumentFragment();
  appendChildren(fragment, (Array.isArray(content) ? content : [content]) as ElementChild[]);
  return fragment;
};

const buildNodes = (content: FlowContent): Node[] => [...buildFragment(content).childNodes];

const removeNodes = (nodes: readonly Node[]) => {
  for (const node of nodes) (node as ChildNode).remove();
};

/**
 * Вставляет узлы сразу после якоря.
 * Пока якорь не в DOM (первый прогон внутри render()), вставлять некуда — вернём false,
 * и вызывающий положит узлы в тот же фрагмент, что и якорь.
 */
const insertAfterAnchor = (nodes: readonly Node[], anchor: Node) => {
  const parent = anchor.parentNode;
  if (!parent) return false;
  const fragment = document.createDocumentFragment();
  fragment.append(...nodes);
  parent.insertBefore(fragment, anchor.nextSibling);
  return true;
};

/**
 * Общая механика блока с подменяемым содержимым: якорь-комментарий, свой скоуп эффектов
 * и замена узлов на месте. Обёртки-элемента нет намеренно — она ломала бы селекторы
 * вроде `ul > li` и `:nth-child`.
 */
const createSwapper = (label: string) => {
  const anchor = document.createComment(label);
  const fragment = document.createDocumentFragment();
  fragment.append(anchor);

  let scope: EffectScope | null = null;
  let nodes: Node[] = [];

  /** Уничтожает прошлое содержимое и строит новое в свежем скоупе. */
  const swap = (render: (() => FlowContent) | undefined) => {
    scope?.dispose();
    removeNodes(nodes);

    const nextScope = createEffectScope();
    scope = nextScope;
    nodes = render ? nextScope.run(() => buildNodes(render())) : [];

    if (!insertAfterAnchor(nodes, anchor)) fragment.append(...nodes);
  };

  /**
   * Уничтожение уносит и скоуп, и узлы. Убирать узлы обязательно: блок может лежать
   * внутри each, где родительская запись помнит лишь тот список узлов, что был на
   * момент сборки, — подменённое содержимое она бы не вычистила.
   */
  const dispose = () => {
    scope?.dispose();
    removeNodes(nodes);
    nodes = [];
  };

  return { fragment, swap, dispose };
};

/**
 * Условный рендер: when(isOpen, () => div("открыто"), () => div("закрыто")).
 *
 * Ветка пересобирается только при смене истинности условия, а не при любом изменении
 * сигнала. Ветка собирается без отслеживания: чтобы содержимое обновлялось, читайте
 * сигналы через детей и конфиг (у них свои эффекты) или возьмите dynamic.
 */
export const when = (
  condition: () => unknown,
  renderTrue: () => FlowContent,
  renderFalse?: () => FlowContent,
): DocumentFragment => {
  const { fragment, swap, dispose } = createSwapper("when");
  let branch: boolean | null = null;
  let isFirstRun = true;

  hostEffect(() => {
    // Читаем условие безусловно и первой строкой — это и есть подписка блока.
    const next = Boolean(condition());
    if (next === branch) return;
    branch = next;

    // untracked: сборка ветки не должна добавлять зависимости этому эффекту,
    // иначе он перезапускался бы на изменение чего угодно внутри ветки.
    untracked(() => swap(next ? renderTrue : renderFalse));

    if (isFirstRun) {
      isFirstRun = false;
      onDispose(dispose);
    }
  });

  return fragment;
};

/**
 * Реактивный узел: dynamic(() => user() ? profile(user()) : loginForm()).
 *
 * В отличие от when пересобирает содержимое при изменении ЛЮБОГО сигнала, прочитанного
 * прямо в render — то есть render выполняется с отслеживанием. Эффекты, созданные внутри
 * (дети-сигналы, реактивные пропсы), в зависимости блока не попадают: они живут в его
 * скоупе и обновляют себя сами, не вызывая пересборку.
 */
export const dynamic = (render: () => FlowContent): DocumentFragment => {
  const { fragment, swap, dispose } = createSwapper("dynamic");
  let isFirstRun = true;

  hostEffect(() => {
    swap(render);

    if (isFirstRun) {
      isFirstRun = false;
      onDispose(dispose);
    }
  });

  return fragment;
};

/**
 * Позиции записей, которые уже стоят в правильном относительном порядке, — наибольшая
 * возрастающая подпоследовательность старых индексов. Двигаем только всё остальное:
 * иначе перестановка двух строк тащила бы за собой весь диапазон между ними
 * (курсор застревал бы на первой не совпавшей записи, и перед ним переинсертилось бы
 * всё до конца списка).
 *
 * Patience sorting за O(n log n): tails[k] — позиция последнего элемента среди
 * возрастающих подпоследовательностей длины k+1, prevAt — предшественник для
 * восстановления самой подпоследовательности.
 */
const findStablePositions = (oldIndexes: readonly number[]): ReadonlySet<number> => {
  const stable = new Set<number>();
  const tails: number[] = [];
  const prevAt = new Array<number>(oldIndexes.length).fill(-1);

  for (let i = 0; i < oldIndexes.length; i++) {
    const oldIndex = oldIndexes[i]!;
    // Запись создана прямо сейчас: её всё равно вставлять, в подпоследовательность не берём.
    if (oldIndex < 0) continue;

    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (oldIndexes[tails[mid]!]! < oldIndex) lo = mid + 1;
      else hi = mid;
    }

    if (lo > 0) prevAt[i] = tails[lo - 1]!;
    tails[lo] = i;
  }

  let cursor = tails.length > 0 ? tails[tails.length - 1]! : -1;
  while (cursor >= 0) {
    stable.add(cursor);
    cursor = prevAt[cursor]!;
  }

  return stable;
};

type ListEntry<T> = {
  key: unknown;
  item: ReturnType<typeof signal<T>>;
  index: ReturnType<typeof signal<number>>;
  /** Якорь записи. Сами узлы не храним: вложенный when их подменяет, список устарел бы. */
  start: Comment;
  scope: EffectScope;
};

/**
 * Списочный рендер с переиспользованием по ключу:
 *
 *   each(items, (item, index) => li({}, index, ": ", item))
 *
 * В рендер приходят сигналы, а не значения: при обновлении списка узлы элемента
 * переиспользуются, а меняется только содержимое его сигналов.
 * Ключ по умолчанию — сам элемент (годится для примитивов); для объектов передайте getKey.
 */
export const each = <T>(
  source: () => readonly T[],
  renderItem: (item: ReadonlySignal<T>, index: ReadonlySignal<number>) => FlowContent,
  getKey: (item: T, index: number) => unknown = (item) => item,
): DocumentFragment => {
  // Два якоря: между ними живут записи. Без замыкающего якоря диапазон последней записи
  // утёк бы на соседей блока — div({}, each(...), "хвост") съел бы «хвост».
  const startAnchor = document.createComment("each");
  const endAnchor = document.createComment("/each");
  const fragment = document.createDocumentFragment();
  fragment.append(startAnchor, endAnchor);

  let entries: ListEntry<T>[] = [];
  let isFirstRun = true;
  let warnedAboutKeys = false;

  /**
   * Живые узлы каждой записи — от её якоря до якоря следующей. Считаем по DOM, а не по
   * сохранённому списку: вложенный when подменяет свои узлы, и сохранённый список
   * устарел бы (переупорядочивание вернуло бы в дерево уже удалённый узел).
   */
  const collectRanges = () => {
    const ranges = new Map<Comment, Node[]>();
    const starts = new Set<Node>(entries.map((entry) => entry.start));

    let current: Node[] | null = null;
    let node = startAnchor.nextSibling;
    while (node && node !== endAnchor) {
      if (starts.has(node)) {
        current = [node];
        ranges.set(node as Comment, current);
      } else current?.push(node);
      node = node.nextSibling;
    }
    return ranges;
  };

  /** Сначала скоуп: вложенные блоки уберут свои узлы сами, потом добираем остальное. */
  const disposeEntry = (entry: ListEntry<T>, range: readonly Node[]) => {
    entry.scope.dispose();
    removeNodes(range);
  };

  hostEffect(() => {
    const list = source();

    untracked(() => {
      const ranges = collectRanges();
      const previous = new Map<unknown, ListEntry<T>>();
      for (const entry of entries) previous.set(entry.key, entry);

      const seen = new Set<unknown>();
      const next: ListEntry<T>[] = [];
      /** Позиция записи в прошлом проходе; -1 — запись создана прямо сейчас. */
      const oldIndexes: number[] = [];

      list.forEach((value, index) => {
        let key = getKey(value, index);

        if (seen.has(key)) {
          if (!warnedAboutKeys) {
            warnedAboutKeys = true;
            console.warn(
              "each: ключ повторяется, такие элементы пересоздаются на каждое обновление — передайте getKey",
              key,
            );
          }
          // Уникальный ключ на этот прогон: переиспользовать нечего, зато нет коллизии.
          key = Symbol("duplicate-key");
        }
        seen.add(key);

        const reused = previous.get(key);
        if (reused) {
          previous.delete(key);
          // Читаем до записи нового значения: сигнал индекса и хранит позицию прошлого прохода.
          oldIndexes.push(reused.index());
          reused.item.set(value);
          reused.index.set(index);
          next.push(reused);
          return;
        }

        const scope = createEffectScope();
        const item = signal(value);
        const indexSignal = signal(index);
        const start = document.createComment("item");
        const nodes = scope.run(() => buildNodes(renderItem(item, indexSignal)));

        ranges.set(start, [start, ...nodes]);
        oldIndexes.push(-1);
        next.push({ key, item, index: indexSignal, start, scope });
      });

      // Всё, что не переиспользовали, — уничтожаем вместе с его эффектами.
      previous.forEach((stale) => disposeEntry(stale, ranges.get(stale.start) ?? [stale.start]));

      entries = next;

      // Приводим порядок узлов к порядку списка: стоящие на месте не трогаем.
      // parentNode есть всегда — на первом прогоне это фрагмент с обоими якорями.
      const parent = startAnchor.parentNode;
      if (!parent) return;

      // Идём с конца: якорь вставки — первый узел уже расставленного правого соседа.
      // Записи из стабильной подпоследовательности не двигаем, только сдвигаем на них якорь.
      const stable = findStablePositions(oldIndexes);
      let anchor: Node = endAnchor;

      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i]!;
        if (!stable.has(i)) {
          // Узлы вставляются по одному перед общим якорем, поэтому их порядок сохраняется.
          for (const node of ranges.get(entry.start) ?? [entry.start]) {
            parent.insertBefore(node, anchor);
          }
        }
        anchor = entry.start;
      }
    });

    if (isFirstRun) {
      isFirstRun = false;
      onDispose(() => {
        const ranges = collectRanges();
        entries.forEach((entry) => disposeEntry(entry, ranges.get(entry.start) ?? [entry.start]));
        entries = [];
      });
    }
  });

  return fragment;
};
