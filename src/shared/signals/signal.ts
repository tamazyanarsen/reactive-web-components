import {
  CHECK,
  CLEAN,
  DIRTY,
  SIGNAL,
  type EffectCb,
  type EqualsFn,
  type NodeState,
  type ObserverNode,
  type ReactiveSignal,
  type ReadonlySignal,
  type SignalOptions,
  type SourceNode,
} from "./types";
import { adoptEffect } from "./owner";

/**
 * Кто сейчас читает сигналы. Отслеживание и владение разведены: computed отслеживает
 * свои источники, но эффекты, созданные внутри его вычисления, ему не принадлежат.
 */
let currObserver: ObserverNode | null = null;

/** Чей прогон идёт сейчас: ему достаются вложенные эффекты, onCleanup и onDispose. */
let currEffectCb: EffectCb | null = null;

/** Глубина batch(): пока больше нуля, оповещения копятся вместо немедленного прогона. */
let batchDepth = 0;
let flushing = false;

/** Глубина вложенных прогонов эффектов: отписку осиротевших computed делаем на нуле. */
let runDepth = 0;

/**
 * Растёт на каждую запись в любой сигнал. computed без наблюдателей не подписан на
 * источники и по этому счётчику понимает, можно ли отдать запомненное значение.
 */
let globalVersion = 0;

/** Очередь эффектов на прогон. Set схлопывает повторы — ромб не даёт двойного прогона. */
const pending = new Set<EffectCb>();

/**
 * Предохранитель от эффекта, который сам себя будит: без него страница просто зависает,
 * а так получаем стек с виновником. Порог заведомо выше любой честной цепочки пересчётов.
 */
const MAX_FLUSH_STEPS = 100_000;

/** Подписывает текущего наблюдателя на источник. Повторное чтение ничего не добавляет. */
const track = (source: SourceNode) => {
  const observer = currObserver;
  if (!observer || observer.sources.has(source)) return;
  observer.sources.add(source);
  source.observers.add(observer);
};

/**
 * Отписывает наблюдателя от всех источников перед новым прогоном: зависимости
 * пересобираются заново, иначе условная ветка (`useA() ? a() : b()`) не получала бы
 * обновлений второй ветки.
 */
const untrackAll = (observer: ObserverNode) => {
  for (const source of observer.sources) {
    source.observers.delete(observer);
    if (source.observers.size === 0) source.unobserved?.();
  }
  observer.sources.clear();
};

/**
 * computed, потерявшие всех наблюдателей. Отписываем их не сразу, а когда прогон
 * закончится: эффект на перезапуске отписывается от всего и тут же подписывается снова,
 * и немедленная отписка выбрасывала бы запомненное значение на каждом прогоне.
 */
const orphans = new Set<{ release(): void; observers: Set<ObserverNode> }>();

const releaseOrphans = () => {
  while (orphans.size) {
    const orphan: { release(): void; observers: Set<ObserverNode> } = orphans.values().next().value!;
    orphans.delete(orphan);
    if (orphan.observers.size === 0) orphan.release();
  }
};

/** Отписка осиротевших, если сейчас не идёт ни один прогон. */
const releaseIfIdle = () => {
  if (runDepth === 0) releaseOrphans();
};

/**
 * Уничтожает эффекты, созданные прошлым прогоном.
 *
 * Снимок обязателен: destroy вычёркивает ребёнка из этого же множества, а мутировать
 * Set во время обхода нельзя.
 */
const disposeChildren = (effectCb: EffectCb) => {
  if (effectCb.children.size === 0) return;
  const children = [...effectCb.children];
  effectCb.children.clear();
  for (const child of children) child.destroy();
};

/**
 * Дотягивает computed-источники наблюдателя в состоянии CHECK. Если хоть один
 * действительно изменился, он переведёт наблюдателя в DIRTY — дальше смотреть незачем.
 */
const confirmDirty = (observer: ObserverNode) => {
  if (observer.state !== CHECK) return observer.state === DIRTY;
  for (const source of observer.sources) {
    source.refresh?.();
    if ((observer.state as NodeState) === DIRTY) return true;
  }
  observer.state = CLEAN;
  return false;
};

/** Один прогон эффекта с пересбором зависимостей. */
const runEffect = (effectCb: EffectCb) => {
  if (effectCb.destroyed) return;
  // CHECK: выше изменился сигнал, но computed между ним и эффектом мог пересчитаться
  // в то же значение — тогда прогон не нужен.
  if (!confirmDirty(effectCb)) return;
  effectCb.state = CLEAN;

  // Сначала вложенные: их уборка должна пройти до уборки того, кто их создал.
  disposeChildren(effectCb);

  effectCb.cleanupSet.forEach((cleanup) => cleanup());
  effectCb.cleanupSet.clear();
  untrackAll(effectCb);

  const prevObserver = currObserver;
  const prevEffectCb = currEffectCb;
  currObserver = effectCb;
  currEffectCb = effectCb;
  runDepth++;
  try {
    effectCb();
  } finally {
    currObserver = prevObserver;
    currEffectCb = prevEffectCb;
    runDepth--;
    effectCb.started = true;
    releaseIfIdle();
  }
};

/** Разбирает очередь по одному: повторно добавленный эффект схлопнется в Set. */
const flush = () => {
  flushing = true;
  let steps = 0;
  try {
    while (pending.size) {
      if (++steps > MAX_FLUSH_STEPS) {
        pending.clear();
        throw new Error("[rwc] infinite loop in effects: an effect writes to a signal it depends on");
      }
      const effectCb: EffectCb = pending.values().next().value!;
      pending.delete(effectCb);
      runEffect(effectCb);
    }
  } finally {
    flushing = false;
  }
};

/**
 * Группирует записи: подписчики выполнятся один раз после выхода из fn.
 * computed внутри batch() уже актуален — он пересчитывается при чтении.
 */
export const batch = <T>(fn: () => T): T => {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0 && !flushing) flush();
  }
};

const defaultEquals: EqualsFn<unknown> = Object.is;

const resolveEquals = <T>(options?: SignalOptions<T>): EqualsFn<T> | null =>
  options?.equals === false ? null : ((options?.equals ?? defaultEquals) as EqualsFn<T>);

export const signal = <T>(initValue: T, options?: SignalOptions<T>): ReactiveSignal<T> => {
  let currValue = initValue;
  const equals = resolveEquals(options);
  const node: SourceNode = { observers: new Set() };

  const signalFunc = () => {
    track(node);
    return currValue;
  };

  signalFunc.peek = () => currValue;

  signalFunc.set = (v: T) => {
    if (equals?.(currValue, v)) return;
    currValue = v;
    globalVersion++;

    // Снимок: computed, получив оповещение, не трогает этот набор, но эффект — может,
    // если его уничтожат из-за оповещения соседа.
    for (const observer of [...node.observers]) observer.notify(DIRTY);

    // Вне batch запись остаётся синхронной: сразу после set DOM уже обновлён.
    // flushing защищает от повторного входа, когда set вызван из тела эффекта.
    if (batchDepth === 0 && !flushing) flush();
  };

  // Чтение через peek: обновление от предыдущего значения не должно подписывать
  // текущий эффект на сигнал, в который он же и пишет.
  signalFunc.update = (fn: (prev: T) => T) => signalFunc.set(fn(currValue));

  signalFunc[SIGNAL] = true as const;

  return signalFunc as ReactiveSignal<T>;
};

/**
 * Создаёт эффект: тело выполняется сразу и потом на каждое изменение прочитанного.
 *
 * Эффект, созданный внутри прогона другого эффекта, становится его ребёнком: он умрёт
 * при перезапуске родителя и будет создан заново. Так `effect(() => { ... effect(...) })`
 * не копит эффекты с каждым прогоном.
 */
export const effect = (cb: VoidFunction): EffectCb => {
  const newEffectCb = cb as EffectCb;
  newEffectCb.state = DIRTY;
  newEffectCb.sources = new Set();
  newEffectCb.cleanupSet = new Set();
  newEffectCb.disposeSet = new Set();
  newEffectCb.children = new Set();

  newEffectCb.notify = (state) => {
    if (newEffectCb.state >= state) return;
    newEffectCb.state = state;
    pending.add(newEffectCb);
  };

  const owner = currEffectCb;
  if (owner) {
    newEffectCb.parent = owner;
    owner.children.add(newEffectCb);
  } else {
    // Родительского прогона нет — эффект забирает текущий компонент или скоуп, если мы
    // внутри render(). Иначе effect() в render() пережил бы сам компонент.
    adoptEffect(newEffectCb);
  }

  newEffectCb.destroy = () => {
    if (newEffectCb.destroyed) return;
    newEffectCb.destroyed = true;
    // Из очереди тоже убираем: с батчингом эффект может ждать прогона.
    pending.delete(newEffectCb);

    newEffectCb.parent?.children.delete(newEffectCb);
    newEffectCb.parent = undefined;

    disposeChildren(newEffectCb);

    newEffectCb.cleanupSet.forEach((cleanup) => cleanup());
    newEffectCb.cleanupSet.clear();
    newEffectCb.disposeSet.forEach((cleanup) => cleanup());
    newEffectCb.disposeSet.clear();
    untrackAll(newEffectCb);
    releaseIfIdle();
  };

  runEffect(newEffectCb);
  return newEffectCb;
};

/**
 * Выполняет fn без подписки на прочитанные внутри сигналы.
 *
 * Кроме отписки это ещё и разрыв владения: созданный внутри эффект не станет ребёнком
 * текущего. Так работают скоупы when/each — они уничтожают своё содержимое сами.
 */
export const untracked = <T>(fn: () => T): T => {
  const prevObserver = currObserver;
  const prevEffectCb = currEffectCb;
  currObserver = null;
  currEffectCb = null;
  try {
    return fn();
  } finally {
    currObserver = prevObserver;
    currEffectCb = prevEffectCb;
  }
};

/**
 * Уборка перед следующим прогоном эффекта и при его уничтожении.
 * Сюда вешают то, что создаётся заново на каждом прогоне: таймеры, подписки на DOM.
 */
export const onCleanup = (fn: VoidFunction) => {
  currEffectCb?.cleanupSet.add(fn);
};

/**
 * Уборка только на уничтожение эффекта — переживает перезапуски.
 * Для ресурсов, живущих столько же, сколько сам эффект (скоупы when/each).
 *
 * Регистрируется лишь на первом прогоне: иначе повторные вызовы копили бы
 * обработчики на каждом перезапуске. Для уборки на каждый прогон есть onCleanup.
 */
export const onDispose = (fn: VoidFunction) => {
  if (!currEffectCb) return;
  if (currEffectCb.started) {
    console.warn("[rwc] onDispose called after the first run; use onCleanup", fn);
    return;
  }
  currEffectCb.disposeSet.add(fn);
};

/**
 * Ленивое производное значение с запоминанием. Прикладной код обычно берёт `computed`.
 *
 * Пересчёт идёт при чтении и только если источник действительно изменился (push-pull):
 * запись в сигнал лишь помечает computed «грязным» и будит его наблюдателей, а те,
 * прежде чем выполниться, дотягивают значение. Отсюда два свойства:
 *
 * - нет промежуточных состояний: в ромбе a → (b, c) → d эффект d видит b и c
 *   согласованными, сколько бы уровней computed ни было между ними;
 * - пересчёт в то же значение (по equals) не будит наблюдателей.
 *
 * Пока computed никто не читает в эффекте, он не подписан на источники и ничего не
 * держит — ему не нужен владелец, утечки нет.
 *
 * Второй аргумент раньше задавал владельца эффекта пересчёта; теперь эффекта нет,
 * функция в этой позиции игнорируется ради совместимости.
 */
export const createComputed = <T>(
  compute: () => T,
  options?: SignalOptions<T> | ((cb: VoidFunction) => void),
): ReadonlySignal<T> => {
  const equals = resolveEquals(typeof options === "function" ? undefined : options);

  let value: T;
  let hasValue = false;
  /** Подписан на источники — значит, оповещения о записях до него доходят. */
  let subscribed = false;
  /** globalVersion на момент вычисления: им проверяется свежесть без подписки. */
  let computedAt = -1;

  const node: ObserverNode &
    SourceNode & { release(): void; refresh(): void; unobserved(): void } = {
    state: DIRTY,
    sources: new Set(),
    observers: new Set(),

    notify: (state) => {
      if (node.state >= state) return;
      const wasClean = node.state === CLEAN;
      node.state = state;
      // Наблюдателям хватает одного CHECK: дальше они сами дотянут значение.
      if (wasClean) for (const observer of node.observers) observer.notify(CHECK);
    },

    refresh: () => {
      if (subscribed) {
        if (!confirmDirty(node)) return;
      } else if (hasValue && node.observers.size === 0 && computedAt === globalVersion) {
        // Не подписан и никто не наблюдает, но с прошлого вычисления ни одной записи не было.
        return;
      }
      recompute();
    },

    unobserved: () => {
      orphans.add(node);
    },

    release: () => {
      untrackAll(node);
      subscribed = false;
      node.state = DIRTY;
    },
  };

  const recompute = () => {
    untrackAll(node);

    const prevObserver = currObserver;
    const prevEffectCb = currEffectCb;
    currObserver = node;
    // Эффекты, созданные внутри вычисления, computed не принадлежат.
    currEffectCb = null;
    let next: T;
    try {
      next = compute();
    } catch (error) {
      node.state = DIRTY;
      throw error;
    } finally {
      currObserver = prevObserver;
      currEffectCb = prevEffectCb;
    }

    node.state = CLEAN;
    subscribed = true;
    computedAt = globalVersion;

    if (hasValue && equals?.(value, next)) return;
    value = next;
    hasValue = true;

    // Будим только тех, кто ждёт проверки. Наблюдатель в CLEAN — это тот, кто читает
    // нас прямо сейчас впервые: он и так получит свежее значение.
    for (const observer of node.observers) {
      if (observer.state === CHECK) observer.state = DIRTY;
    }
  };

  const read = () => {
    // Сначала подписка, потом refresh: тогда пересчёт видит, что наблюдатель есть,
    // и остаётся подписанным на источники.
    track(node);
    node.refresh();
    if (node.observers.size === 0) {
      orphans.add(node);
      releaseIfIdle();
    }
    return value;
  };

  read.peek = () => {
    const prevObserver = currObserver;
    currObserver = null;
    try {
      return read();
    } finally {
      currObserver = prevObserver;
    }
  };
  read[SIGNAL] = true as const;
  return read as ReadonlySignal<T>;
};

/**
 * Проверка «этот ключ выбран?» за O(1) на изменение:
 *
 *   const isSelected = createSelector(selectedId);
 *   each(rows, (row) => tr({ class: { active: () => isSelected(row.peek().id) } }, ...));
 *
 * Если каждая строка читает selectedId() напрямую, смена выбора будит все строки. Здесь
 * у каждого ключа свой источник, и просыпаются только две строки: та, с которой выбор
 * ушёл, и та, на которую пришёл. Источник ключа живёт, пока его кто-то читает.
 */
export const createSelector = <T>(
  source: () => T,
  equals: (key: T, selected: T) => boolean = Object.is,
): ((key: T) => boolean) => {
  const nodes = new Map<T, SourceNode>();
  let current: T;
  let started = false;

  const wake = (node: SourceNode | undefined) => {
    if (!node) return;
    for (const observer of [...node.observers]) observer.notify(DIRTY);
  };

  effect(() => {
    const next = source();
    const prev = current;
    current = next;
    if (!started) {
      started = true;
      return;
    }
    globalVersion++;
    if (equals === Object.is) {
      // Быстрый путь: при точном сравнении меняется ровно два ключа.
      wake(nodes.get(prev));
      wake(nodes.get(next));
      return;
    }
    for (const [key, node] of nodes) {
      if (equals(key, prev) !== equals(key, next)) wake(node);
    }
  });

  return (key: T) => {
    if (currObserver) {
      let node = nodes.get(key);
      if (!node) {
        node = { observers: new Set(), unobserved: () => nodes.delete(key) };
        nodes.set(key, node);
      }
      track(node);
    }
    return equals(key, current);
  };
};
