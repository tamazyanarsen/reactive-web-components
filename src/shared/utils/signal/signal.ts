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

let isEffectDebugEnabled = false;

export const setEffectDebugEnabled = (enabled: boolean) => {
  isEffectDebugEnabled = enabled;
};

export const effectMap = new Map<
  string,
  {
    signals: Array<ReactiveSignal<any>>;
    parent: string | null;
  }
>();

const cbStack: (() => void)[] = [];

// список вложенных эффектов
const effectStack: (() => void)[] = [];

// список очисток дочерних эффектов
const effectMetadata = new WeakMap<() => void, Set<() => void>>();

// список подписчиков сигналов
const signalSubscribers = new WeakMap<ReactiveSignal<any>, Set<() => void>>();

// список сигналов для каждого эффекта
const effectSubscribers = new WeakMap<() => void, Set<ReactiveSignal<any>>>();

// список очисток эффектов
export const effectCleanup = new WeakMap<() => void, Set<() => void>>();

// Map для компонентов и их эффектов
export const componentEffectMap = new WeakMap<BaseElement, Set<() => void>>();

export const effectComponentMap = new WeakMap<() => void, BaseElement>();

export function signal<T = unknown>(
  initValue: T,
  config?: {
    signalCompareFn?: CompareFn<T>;
    name?: string;
  },
): ReactiveSignal<T> {
  // const subscribers = new Set<() => void>();

  let globalCompareFn = config?.signalCompareFn || (() => true);

  function result() {
    const currCb = effectStack[effectStack.length - 1];

    if (currCb && !("fake" in currCb && currCb.fake)) {
      // добавляем список эффектов, которые подписаны на этот сигнал
      if (!signalSubscribers.has(result)) { signalSubscribers.set(result, new Set()) }
      signalSubscribers.get(result)?.add(currCb);

      // добавляем функцию очистки для эффекта
      if (!effectCleanup.has(currCb)) effectCleanup.set(currCb, new Set());
      effectCleanup.get(currCb)?.add(() => {
        signalSubscribers.get(result)?.delete(currCb);
      });

      // добавляем список сигналов, которые внутри эффекта
      if (!effectSubscribers.has(currCb)) { effectSubscribers.set(currCb, new Set()) }
      effectSubscribers.get(currCb)?.add(result);

      if (isEffectDebugEnabled) { effectMap.get((currCb as any).effectId)?.signals.push(result); }
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
      effectMetadata.get(cb)?.forEach(clean => {
        clean();
      });
      effectMetadata.get(cb)?.clear();
      Promise.resolve().then(() => {
        const currComponent = effectComponentMap.get(cb);
        if (currComponent) componentStack.push(currComponent);
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

  (cb as any).effectId = randomId;

  const parentCb = cbStack[cbStack.length - 1];

  if (isEffectDebugEnabled) {
    effectMap.set(randomId, {
      signals: [],
      // parent: (parentCb as any)?.effectId || null,
      parent: null,
    });
  }

  if (!isFake) cbStack.push(cb);
  effectStack.push(cb);
  // добавляем эффект в компонент
  const currComponent = componentStack[componentStack.length - 1];
  if (currComponent && !isFake) {
    if (!componentEffectMap.has(currComponent)) { componentEffectMap.set(currComponent, new Set()) }
    componentEffectMap.get(currComponent)?.add(cb);
    effectComponentMap.set(cb, currComponent);
  }
  // выполняем эффект
  cb();
  effectStack.pop();
  if (!isFake) cbStack.pop();

  if (parentCb && !isFake) {
    if (!effectMetadata.has(parentCb)) { effectMetadata.set(parentCb, new Set()) }
    effectMetadata.get(parentCb)?.add(() => {
      const signals = effectSubscribers.get(cb);
      signals?.forEach(s => {
        signalSubscribers.get(s)?.delete(cb);
      });
      effectMetadata.get(cb)?.forEach(clean => clean());
      effectMetadata.get(cb)?.clear();
      effectMetadata.delete(cb);
      effectSubscribers.delete(cb);
    });
  }
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
