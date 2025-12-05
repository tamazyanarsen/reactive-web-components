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

// список подписчиков сигналов
const signalSubscribers = new WeakMap<ReactiveSignal<any>, Set<() => void>>();

// список очисток эффектов
export const effectCleanup = new WeakMap<() => void, Set<() => void>>();

// Map для компонентов и их эффектов
export const componentEffectMap = new WeakMap<BaseElement, Set<() => void>>();

export const effectComponentMap = new WeakMap<() => void, WeakRef<BaseElement>>();

export function signal<T = unknown>(
  initValue: T,
  config?: {
    signalCompareFn?: CompareFn<T>;
    name?: string;
  },
): ReactiveSignal<T> {
  let globalCompareFn = config?.signalCompareFn || (() => true);

  function result() {
    const currCb = effectStack[effectStack.length - 1];

    if (currCb && !("fake" in currCb && currCb.fake)) {
      const signalSubscribersRef = new WeakRef(signalSubscribers).deref();
      const effectCleanupRef = new WeakRef(effectCleanup).deref();

      // добавляем список эффектов, которые подписаны на этот сигнал
      if (!signalSubscribersRef?.has(result)) { signalSubscribersRef?.set(result, new Set()) }
      signalSubscribersRef?.get(result)?.add(currCb);

      // добавляем функцию очистки для эффекта
      if (!effectCleanupRef?.has(currCb)) effectCleanupRef?.set(currCb, new Set());
      effectCleanupRef?.get(currCb)?.add(() => {
        signalSubscribersRef?.get(result)?.delete(currCb);
      });

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
    new WeakRef(signalSubscribers).deref()?.get(result)?.clear();
  };

  result.getSubscribers = function () {
    return new WeakRef(signalSubscribers).deref()?.get(result);
  };

  result.peek = function () {
    return Object.freeze(initValue);
  };

  result.initValue = Object.freeze(initValue);

  result.forceSet = function (value: T) {
    initValue = value;
    const effectComponentMapRef = new WeakRef(effectComponentMap).deref();
    new WeakRef(signalSubscribers).deref()?.get(result)?.forEach(cb => {
      Promise.resolve().then(() => {
        const currComponent = effectComponentMapRef?.get(cb)?.deref();
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

  if (isEffectDebugEnabled) {
    effectMap.set(randomId, {
      signals: [],
      parent: null,
    });
  }

  if (!isFake) cbStack.push(cb);
  effectStack.push(cb);
  // добавляем эффект в компонент
  const currComponent = componentStack[componentStack.length - 1];
  if (currComponent && !isFake) {
    const componentEffectMapRef = new WeakRef(componentEffectMap).deref();
    if (!componentEffectMapRef?.has(currComponent)) { componentEffectMapRef?.set(currComponent, new Set()) }
    componentEffectMapRef?.get(currComponent)?.add(cb);
    new WeakRef(effectComponentMap).deref()?.set(cb, new WeakRef(currComponent));
  }
  // выполняем эффект
  cb();
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
