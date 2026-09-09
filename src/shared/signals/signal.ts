import {
  SIGNAL,
  type EffectCb,
  type EqualsFn,
  type ReactiveSignal,
  type ReadonlySignal,
  type SignalOptions,
} from "./types";

let currEffectCb: EffectCb | null = null;

/** Глубина batch(): пока больше нуля, оповещения копятся вместо немедленного прогона. */
let batchDepth = 0;
let flushing = false;

/** Очередь эффектов на прогон. Set схлопывает повторы — ромб не даёт двойного прогона. */
const pending = new Set<EffectCb>();

/**
 * Предохранитель от эффекта, который сам себя будит: без него страница просто зависает,
 * а так получаем стек с виновником. Порог заведомо выше любой честной цепочки пересчётов.
 */
const MAX_FLUSH_STEPS = 100_000;

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
 * Один прогон эффекта с пересбором зависимостей.
 *
 * Отписки живут в cleanupSet и сбрасываются перед каждым прогоном: иначе эффект
 * навсегда остался бы подписан на то, что прочитал в первый раз, и условная ветка
 * (`useA() ? a() : b()`) не получала бы обновлений второй ветки.
 */
const runEffect = (effectCb: EffectCb) => {
  if (effectCb.destroyed) return;

  // Сначала вложенные: их уборка должна пройти до уборки того, кто их создал.
  disposeChildren(effectCb);

  effectCb.cleanupSet.forEach((cleanup) => cleanup());
  effectCb.cleanupSet.clear();

  const prevEffectCb = currEffectCb;
  currEffectCb = effectCb;
  try {
    effectCb();
  } finally {
    currEffectCb = prevEffectCb;
    effectCb.started = true;
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
        throw new Error(
          "бесконечный цикл в эффектах: эффект пишет в сигнал, от которого сам зависит",
        );
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
 * Внутри batch() computed отдаёт ещё не пересчитанное значение — это цена группировки.
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

export const signal = <T>(initValue: T, options?: SignalOptions<T>): ReactiveSignal<T> => {
  let currValue = initValue;

  const equals = options?.equals === false ? null : ((options?.equals ?? defaultEquals) as EqualsFn<T>);
  const subscribers = new Set<EffectCb>();

  const signalFunc = () => {
    // Локальная копия обязательна: cleanup выполнится позже, когда currEffectCb
    // уже другой, и delete чужого подписчика отписал бы не того.
    const subscriber = currEffectCb;
    if (subscriber) {
      subscribers.add(subscriber);
      subscriber.cleanupSet.add(() => {
        subscribers.delete(subscriber);
      });
    }
    return currValue;
  };

  signalFunc.peek = () => currValue;

  signalFunc.set = (v: T) => {
    if (equals?.(currValue, v)) return;
    currValue = v;

    subscribers.forEach((subscriber) => pending.add(subscriber));

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
  newEffectCb.cleanupSet = new Set();
  newEffectCb.disposeSet = new Set();
  newEffectCb.children = new Set();

  const owner = currEffectCb;
  if (owner) {
    newEffectCb.parent = owner;
    owner.children.add(newEffectCb);
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
  const prev = currEffectCb;
  currEffectCb = null;
  try {
    return fn();
  } finally {
    currEffectCb = prev;
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
    console.warn("onDispose вызван после первого прогона — используйте onCleanup", fn);
    return;
  }
  currEffectCb.disposeSet.add(fn);
};

/**
 * Низкоуровневый конструктор производного значения. Прикладной код использует `computed`
 * из render-context — он привязывает пересчёт к текущему компоненту.
 *
 * Пересчёт живёт на эффекте, который создаёт `createEffect`.
 */
export const createComputed = <T>(
  compute: () => T,
  createEffect: (cb: VoidFunction) => void = effect,
): ReadonlySignal<T> => {
  // Значение появится на первом же прогоне эффекта, он запускается синхронно.
  const inner = signal(undefined as T);
  createEffect(() => inner.set(compute()));

  const read = () => inner();
  read.peek = inner.peek;
  read[SIGNAL] = true as const;
  return read as ReadonlySignal<T>;
};
