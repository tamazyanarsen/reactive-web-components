/** Бренд реактивного источника: отличает сигнал от обычной функции-значения. */
export const SIGNAL: unique symbol = Symbol("rwc.signal");

/** Читаемый источник: сигнал или computed. Ковариантен по T — только возвращает значение. */
export type ReadonlySignal<T> = (() => T) & {
  readonly [SIGNAL]: true;
  /** Значение без подписки: читающий эффект не станет зависеть от этого источника. */
  peek(): T;
};

export type ReactiveSignal<T> = ReadonlySignal<T> & {
  set(value: T): void;
  /** Запись от предыдущего значения: count.update((n) => n + 1). Чтение без подписки. */
  update(fn: (prev: T) => T): void;
};

/**
 * Значение, которое можно передать статикой или сигналом.
 * Для позиций, где само значение может быть функцией (пропсы компонентов): там обычная
 * функция — это значение, и отличить её от реактивного источника можно только по бренду.
 */
export type MaybeSignal<T> = T | ReadonlySignal<T>;

/**
 * То же, но обычная функция тоже считается реактивным источником.
 * Годится там, где значение функцией быть не может: дети, атрибуты, стили, свойства
 * HTML-элементов. Такой источник дешевле computed — эффект есть, лишнего сигнала нет.
 */
export type MaybeReactive<T> = T | ReadonlySignal<T> | (() => T);

/** Сравнение старого и нового значения: true — значение то же, подписчиков не будим. */
export type EqualsFn<T> = (prev: T, next: T) => boolean;

export type SignalOptions<T> = {
  /**
   * Чем считать «то же самое значение». По умолчанию Object.is.
   * `false` отключает сравнение: подписчики просыпаются на каждую запись — нужно для
   * мутируемых объектов, которые записывают той же ссылкой.
   */
  equals?: EqualsFn<T> | false;
};

/**
 * Состояние узла графа: CLEAN — значение актуально, CHECK — изменился кто-то выше по
 * цепочке computed и надо проверить, дошло ли изменение, DIRTY — пересчитать точно.
 */
export type NodeState = 0 | 1 | 2;
export const CLEAN = 0;
export const CHECK = 1;
export const DIRTY = 2;

/** Источник: сигнал или computed. refresh есть только у computed — дотягивает значение. */
export type SourceNode = {
  observers: Set<ObserverNode>;
  refresh?: () => void;
  /** Последний наблюдатель ушёл — computed может отписаться от своих источников. */
  unobserved?: () => void;
};

/** Наблюдатель: эффект или computed. Источники пересобираются на каждом прогоне. */
export type ObserverNode = {
  state: NodeState;
  sources: Set<SourceNode>;
  notify: (state: typeof CHECK | typeof DIRTY) => void;
};

export type EffectCb = (() => void) &
  ObserverNode & {
  /** onCleanup. Выполняется и сбрасывается перед каждым прогоном и при уничтожении. */
  cleanupSet: Set<() => void>;
  /** Уборка на уничтожение эффекта — переживает все прогоны. См. onDispose. */
  disposeSet: Set<() => void>;
  /**
   * Эффекты, созданные внутри прогона этого. Уничтожаются перед каждым перезапуском
   * и вместе с родителем: вложенный эффект живёт ровно столько, сколько прогон,
   * который его создал.
   */
  children: Set<EffectCb>;
  /** Владелец. Нужен, чтобы уничтоженный эффект вычеркнул себя из его children. */
  parent?: EffectCb;
  /** Первый прогон завершён: после него onDispose регистрировать уже нельзя. */
  started?: boolean;
  /** Уничтоженный эффект не должен выполниться, даже если уже стоит в очереди. */
  destroyed?: boolean;
  destroy: () => void;
};
