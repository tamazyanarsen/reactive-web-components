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

const buildNodes = (content: FlowContent): Node[] => {
  // Самый частый случай — один элемент (li, tr): без промежуточного фрагмента.
  // Фрагмент разворачивать нельзя — у него узлы внутри, а не он сам.
  if (content instanceof Node && content.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return [content];
  return [...buildFragment(content).childNodes];
};

const removeNodes = (nodes: readonly Node[]) => {
  for (const node of nodes) (node as ChildNode).remove();
};

type MovableParent = ParentNode & { moveBefore?: (node: Node, child: Node | null) => void };

/**
 * Переставляет узел внутри живого дерева. Element.moveBefore() двигает атомарно: у
 * веб-компонентов не срабатывает пара disconnect/connect, у iframe и видео не сбрасывается
 * состояние, фокус остаётся на месте. Где его нет или он отказал (узел вне документа,
 * разные деревья) — обычный insertBefore.
 */
const moveNode = (parent: Node, node: Node, before: Node | null) => {
  const movable = parent as MovableParent;
  if (movable.moveBefore && parent.isConnected && node.isConnected) {
    try {
      movable.moveBefore(node, before);
      return;
    } catch {
      // Падаем на insertBefore ниже.
    }
  }
  parent.insertBefore(node, before);
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
  /** Сигнал индекса — только если рендер его принимает (второй аргумент). */
  index: ReturnType<typeof signal<number>> | null;
  /** Позиция в прошлом проходе: по ней считается, кого двигать. */
  position: number;
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

  /**
   * Сигнал индекса нужен не всем: рендер вида (item) => li(item) его не читает, а на
   * тысяче строк лишний сигнал — заметная память. Смотрим на число параметров рендера.
   */
  const wantsIndex = renderItem.length >= 2;
  const noIndex = signal(-1) as ReadonlySignal<number>;

  /**
   * Быстрая очистка: список пустеет, а блок — единственное содержимое родителя (обычный
   * случай: ul(each(...))). Тогда узлы убираются одним textContent, а не по одному.
   */
  const clearFast = (parent: Node) => {
    if (startAnchor.previousSibling !== null || endAnchor.nextSibling !== null) return false;
    for (const entry of entries) entry.scope.dispose();
    entries = [];
    parent.textContent = "";
    parent.appendChild(startAnchor);
    parent.appendChild(endAnchor);
    return true;
  };

  hostEffect(() => {
    const list = source();

    untracked(() => {
      const liveParent = startAnchor.parentNode;
      if (list.length === 0 && entries.length > 0 && liveParent && clearFast(liveParent)) return;

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
              "[rwc] each: duplicate key, such items are recreated on every update; pass getKey",
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
          oldIndexes.push(reused.position);
          reused.position = index;
          reused.item.set(value);
          reused.index?.set(index);
          next.push(reused);
          return;
        }

        const scope = createEffectScope();
        const item = signal(value);
        const indexSignal = wantsIndex ? signal(index) : null;
        const start = document.createComment("item");
        const nodes = scope.run(() => buildNodes(renderItem(item, indexSignal ?? noIndex)));

        ranges.set(start, [start, ...nodes]);
        oldIndexes.push(-1);
        next.push({ key, item, index: indexSignal, position: index, start, scope });
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

      // Новые записи подряд собираются во фрагмент и вставляются одной операцией —
      // тысяча строк не превращается в тысячи вставок в живой DOM. Существующие записи
      // двигаются поштучно: moveBefore сохраняет им состояние, а фрагмент бы его сбросил.
      let batch: ListEntry<T>[] = [];
      let batchAnchor: Node = endAnchor;
      const flushBatch = () => {
        if (batch.length === 0) return;
        const fragment = document.createDocumentFragment();
        for (let k = batch.length - 1; k >= 0; k--) {
          for (const node of ranges.get(batch[k]!.start) ?? [batch[k]!.start]) fragment.appendChild(node);
        }
        parent.insertBefore(fragment, batchAnchor);
        batch = [];
      };

      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i]!;
        if (!stable.has(i) && oldIndexes[i]! < 0) {
          if (batch.length === 0) batchAnchor = anchor;
          batch.push(entry);
          anchor = entry.start;
          continue;
        }
        flushBatch();
        if (!stable.has(i)) {
          // Узлы вставляются по одному перед общим якорем, поэтому их порядок сохраняется.
          for (const node of ranges.get(entry.start) ?? [entry.start]) {
            moveNode(parent, node, anchor);
          }
        }
        anchor = entry.start;
      }
      flushBatch();
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
