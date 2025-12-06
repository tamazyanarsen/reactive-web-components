import { componentStack } from "../clean";
import { projectLog } from "../helpers";
import { BaseElement } from "../html-elements";
import { IsPromise, IsPromiseFunction, UnwrapPromise } from "./helpers.types";
import {
  CompareFn,
  ReactiveSignal,
  SignalUpdateFunc,
  UnwrapSignal,
} from "./signal.type";

const removeOldEffect = (effectCb: EffectCb) => {
  if (effectCb.component?.isConnected) return;
  effectCleanup.get(effectCb)?.forEach(cleanup => cleanup());
  effectCleanup.get(effectCb)?.clear();
  effectCb.childCbs?.forEach( childCb => removeOldEffect(childCb) );
  effectCleanup.delete(effectCb);
}

export type EffectCb = (() => void) & {
  effectId?: string
  component?: BaseElement
  willRemoved?: boolean
  childCbs?: Set<EffectCb>
  signal?: Set<ReactiveSignal<any>>
}

const cbStack: EffectCb[] = [];

// список вложенных эффектов
const effectStack: EffectCb[] = [];

// список подписчиков сигналов
// const signalSubscribers = new WeakMap<ReactiveSignal<any>, Set<() => void>>();

// список очисток эффектов
export const effectCleanup = new Map<EffectCb, Set<() => void>>();

setInterval(() => {
  effectCleanup.forEach((cleanup, effectCb) => {
    if(effectCb.willRemoved) cleanup.forEach(cleanup => cleanup());
    cleanup.clear();
    effectCleanup.delete(effectCb);
  });
}, 1000);

// Map для компонентов и их эффектов
// export const componentEffectMap = new WeakMap<BaseElement, Set<() => void>>();

// export const effectComponentMap = new Map<() => void, WeakRef<BaseElement>>();

const effectTreeCleanup = new WeakMap<EffectCb, Set<() => void>>();

const signalSubscribers = new WeakMap<ReactiveSignal<any>, Set<EffectCb>>();

export function signal<T = unknown>(
  initValue: T,
  config?: {
    signalCompareFn?: CompareFn<T>;
    name?: string;
  },
): ReactiveSignal<T> {
  let globalCompareFn = config?.signalCompareFn || (() => true);

  function result() {
    const currCb = cbStack[cbStack.length - 1];
    const parentCb = cbStack[cbStack.length - 2] as EffectCb | undefined;

    if (currCb && !("fake" in currCb && currCb.fake)) {
      // добавляем список эффектов, которые подписаны на этот сигнал
      if (!signalSubscribers.has(result)) { signalSubscribers.set(result, new Set()) }
      signalSubscribers.get(result)?.add(currCb);
      if (!config?.name) result.setName(currCb.effectId as string);

      if (!currCb.signal) currCb.signal = new Set();
      currCb.signal.add(result);
      if (parentCb) {
        if (!parentCb.childCbs) parentCb.childCbs = new Set();
        parentCb.childCbs.add(currCb);
      }

      // ------------------------------------------------------------
      // Сохраняем функцию удаления в эффекте
      if (!effectCleanup.has(currCb)) effectCleanup.set(currCb, new Set());
      effectCleanup.get(currCb)?.add(() => {
        signalSubscribers.get(result)?.delete(currCb);
      });
      // ------------------------------------------------------------

      // добавляем функцию удаления дочерних эффектов в эффект родителя
      if (parentCb) {
        if (!effectTreeCleanup.has(parentCb)) effectTreeCleanup.set(parentCb, new Set());
        effectTreeCleanup.get(parentCb)?.add(() => {
          signalSubscribers.get(result)?.delete(currCb);
          effectTreeCleanup.get(currCb)?.forEach(cleanup => cleanup());
          effectTreeCleanup.get(currCb)?.clear();
          effectTreeCleanup.delete(currCb);
        });
      }
    }
    return initValue;
  }

  let signalId = '';
  Object.defineProperty(result, 'signalId', {
    get: () => {
      return signalId
    },
    set: (value: string) => {
      signalId = value;
    },
  });

  result.signalId = `${config?.name || ""}_${Math.random().toString(36).substring(2, 15)}`;

  result.setName = function (name: string) {
    result.signalId = `${name}_${Math.random().toString(36).substring(2, 15)}`;
    return result;
  };

  result.setCompareFn = function (compareFn: CompareFn<T>) {
    globalCompareFn = compareFn;
    return result;
  };

  result.clearSubscribers = function () {
    signalSubscribers.get(result)?.clear();
  };

  result.getSubscribers = function () {
    return signalSubscribers.get(result);
  };

  result.peek = function () {
    return Object.freeze(initValue);
  };

  result.initValue = Object.freeze(initValue);

  result.forceSet = function (value: T) {
    initValue = value;
    signalSubscribers.get(result)?.forEach(cb => {
      Promise.resolve().then(() => {
        const currComponent = cb.component;

        if (currComponent) componentStack.push(currComponent);

        effectTreeCleanup.get(cb)?.forEach(cleanup => cleanup());
        effectTreeCleanup.get(cb)?.clear();
        effectTreeCleanup.delete(cb);

        cbStack.push(cb);
        cb();
        cbStack.pop();

        if (currComponent) componentStack.pop();
      });
    });
  };

  result.set = function (
    value: T,
    setCompareFn: CompareFn<T> = globalCompareFn,
  ) {
    if (initValue !== value && setCompareFn(initValue, value)) {
      setTimeout(() => {
        effectCleanup.forEach((_, effectCb) => {
          if (effectCb.component?.isConnected || !effectCb.willRemoved) return;
          removeOldEffect(effectCb);
        });
      });
      result.forceSet(value);
    }
  };

  result.update = function (cb: SignalUpdateFunc<T>) {
    result.set(cb(initValue));
  };

  result.pipe = <R>(
    fn: (sg: T) => R,
    config?: {
      name?: string;
    },
  ) => {
    if (config?.name) result.setName(config.name);
    const resSignal = signal<
      R extends Promise<any> ? UnwrapPromise<R> : UnwrapSignal<R>
    >(null as any);
    effect(() => {
      const signalRes = result();
      effect(() => {
        const fnResult = fn(signalRes);
        if (fnResult instanceof Promise) {
          fnResult.then((v) => resSignal.set(v));
        } else {
          if (isReactiveSignal(fnResult)) {
            effect(() => resSignal.set(fnResult()));
          } else {
            resSignal.set(fnResult as any);
          }
        }
      }, config);
    });
    return resSignal;
  };

  return result;
}

export function effect(
  cb: () => void,
  config?: {
    name?: string;
  },
) {
  const isFake = "fake" in cb && cb.fake;
  const randomId = `${config?.name || ""}_${Math.random().toString(36).substring(2, 15)}`;
  projectLog("current effect", `%c${randomId}%c`);

  const effectCb: EffectCb = cb;
  effectCb.effectId = randomId;

  if (!isFake) cbStack.push(effectCb);
  effectStack.push(effectCb);
  // добавляем эффект в компонент
  const currComponent = componentStack[componentStack.length - 1];
  if (currComponent && !isFake) {
    if (!effectCb.component) { effectCb.component = currComponent; }
  }
  // выполняем эффект
  effectCb();
  effectStack.pop();
  if (!isFake) cbStack.pop();
}

export const isReactiveSignal = <R extends ReactiveSignal<any>>(
  v: R | any,
): v is R =>
  Boolean(v) &&
  ["object", "function"].includes(typeof v) &&
  "set" in v &&
  "update" in v &&
  "forceSet" in v;

/**
 * Reactive String (rs). Создаёт зависимый string сигнал от источника.
 * @param strings
 * @param values
 * @returns
 *
 * @example
 * const source: ReactiveSignal<string> = signal('test')
 * const dependent: ReactiveSignal<string> = rs`abc-${source}`
 * // log: "abc-test"
 */
export function rs<T extends ReactiveSignal<any> | any>(
  strings: TemplateStringsArray,
  ...values: T[]
): ReactiveSignal<string> {
  const newSignal = signal("");

  effect(() => {
    const newValues = values.map((v) =>
      isReactiveSignal(v) ? String(v()) : String(v),
    );
    const result = [strings[0]];
    newValues.forEach((value, i) => {
      result.push(value, strings[i + 1]);
    });
    newSignal.set(result.join(""));
  });
  return newSignal;
}

// Функция createSignal с условными типами вместо перегрузок
export function createSignal<
  T extends Promise<any> | (() => any),
  I extends
  | UnwrapPromise<T extends () => infer R ? UnwrapSignal<R> : T>
  | undefined,
>(
  cb: T,
  initializeValue?: I,
): // Если есть initializeValue
  I extends undefined
  ? // Если нет initializeValue, проверяем, возвращает ли функция Promise
  IsPromise<T> extends true
  ? ReactiveSignal<UnwrapPromise<T> | null>
  : IsPromiseFunction<T> extends true
  ? ReactiveSignal<UnwrapPromise<
    T extends () => infer R ? R : never
  > | null>
  : ReactiveSignal<
    UnwrapPromise<T extends () => infer R ? UnwrapSignal<R> : never>
  >
  : ReactiveSignal<
    UnwrapPromise<T extends () => infer R ? UnwrapSignal<R> : T>
  > {
  const resultSignal = signal<any>(initializeValue ?? null);

  const handleValue = (value: any) => resultSignal.set(value);

  if (cb instanceof Promise) {
    cb.then(handleValue);
  } else if (typeof cb === "function") {
    effect(() => {
      const res = cb();
      if (res instanceof Promise) {
        res.then(handleValue);
      } else if (isReactiveSignal(res)) {
        effect(() => handleValue(res()));
      } else {
        handleValue(res);
      }
    });
  }

  return resultSignal as any;
}
