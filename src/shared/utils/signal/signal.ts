import { projectLog } from "../helpers";
import { IsPromise, IsPromiseFunction, UnwrapPromise } from "./helpers.types";
import { CompareFn, ReactiveSignal, SignalUpdateFunc, UnwrapSignal } from "./signal.type";

interface EffectMetadata {
  parent?: () => void;
  cleanupFns: Set<() => void>;
}

const effectsMetadata = new WeakMap<() => void, EffectMetadata>();
const effectStack: (() => void)[] = []
const cbStack: (() => void)[] = []

export function signal<T = unknown>(
  initValue: T,
  signalCompareFn: CompareFn<T> = () => true
): ReactiveSignal<T> {
  const subscribers = new Set<() => void>()

  let globalCompareFn = signalCompareFn

  function result() {
    const currCb = effectStack[effectStack.length - 1]
    if (currCb && !('fake' in currCb && currCb.fake)) {
      const metadata = effectsMetadata.get(currCb);
      const parentCb = metadata?.parent;

      if (parentCb) {
        const parentMetadata = effectsMetadata.get(parentCb);
        parentMetadata?.cleanupFns.add(() => {
          subscribers.delete(currCb);
        });
      }

      subscribers.add(currCb);
    }
    return initValue
  }

  result.getSubscribers = () => [...subscribers]

  result.setCompareFn = function (compareFn: CompareFn<T>) {
    globalCompareFn = compareFn
    return result
  }

  result.clearSubscribers = function () {
    subscribers.clear();
  }

  result.peek = function () {
    return Object.freeze(initValue);
  }

  result.initValue = Object.freeze(initValue)

  result.oldValue = Object.freeze(initValue)

  result.forceSet = function (value: T) {
    result.oldValue = Object.freeze(initValue)
    initValue = value
    subscribers.forEach(cb => Promise.resolve(cb).then(fn => {
      const metadata = effectsMetadata.get(fn);
      if (metadata && metadata.cleanupFns.size > 0) {
        metadata.cleanupFns.forEach((cleanup) => cleanup());
        metadata.cleanupFns.clear();
      }

      cbStack.push(fn)
      fn();
      cbStack.pop()
    }))
    // subscribers.forEach(cb => cb())
  }

  result.set = function (value: T, setCompareFn: CompareFn<T> = globalCompareFn) {
    if (initValue !== value && setCompareFn(initValue, value)) {
      result.forceSet(value)
    }
  }

  result.update = function (cb: SignalUpdateFunc<T>) {
    result.set(cb(initValue))
  }

  result.pipe = <R>(fn: (sg: T) => R) => {
    const resSignal = signal<R extends Promise<any> ? UnwrapPromise<R> : UnwrapSignal<R>>(null as any)
    effect(() => {
      const fnResult = fn(result())
      if (fnResult instanceof Promise) {
        fnResult.then(v => resSignal.set(v))
      } else {
        if (isReactiveSignal(fnResult)) {
          effect(() => resSignal.set(fnResult()))
        } else {
          resSignal.set(fnResult as any)
        }
      }
    })
    return resSignal
  }

  return result
}

export function effect(cb: () => void) {
  const randomId = Math.random().toString(36).substring(2, 15);
  projectLog('current effect', `${randomId}`);

  const oldCb = cb;

  cb = () => {
    projectLog('current effect callback', `${randomId}`)
    return oldCb()
  }

  const parentCb = cbStack[cbStack.length - 1]

  if (!effectsMetadata.has(cb)) {
    effectsMetadata.set(cb, { cleanupFns: new Set() });
  }

  const metadata = effectsMetadata.get(cb)!;
  if (parentCb) {
    metadata.parent = parentCb;
  } else {
    delete metadata.parent;
  }

  cbStack.push(cb)

  effectStack.push(cb)
  cb()
  effectStack.pop()

  cbStack.pop()
}

export const isReactiveSignal = <R extends ReactiveSignal<any>>(v: R | any): v is R => Boolean(v) &&
  ['object', 'function'].includes(typeof v) && 'set' in v && 'oldValue' in v
  && 'update' in v && 'forceSet' in v

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
  const newSignal = signal('');

  effect(() => {
    const newValues = values.map((v) =>
      isReactiveSignal(v) ? String(v()) : String(v)
    );
    const result = [strings[0]];
    newValues.forEach((value, i) => {
      result.push(value, strings[i + 1]);
    });
    newSignal.set(result.join(''));
  });
  return newSignal;
};

// Функция createSignal с условными типами вместо перегрузок
export function createSignal<
  T extends Promise<any> | (() => any),
  I extends UnwrapPromise<T extends () => infer R ? UnwrapSignal<R> : T> | undefined
>(
  cb: T,
  initializeValue?: I
):
  // Если есть initializeValue
  I extends undefined ?
  // Если нет initializeValue, проверяем, возвращает ли функция Promise
  (IsPromise<T> extends true ?
    ReactiveSignal<UnwrapPromise<T> | null> :
    (IsPromiseFunction<T> extends true ?
      ReactiveSignal<UnwrapPromise<T extends () => infer R ? R : never> | null> :
      ReactiveSignal<UnwrapPromise<T extends () => infer R ? UnwrapSignal<R> : never>>
    )
  )
  : ReactiveSignal<UnwrapPromise<T extends () => infer R ? UnwrapSignal<R> : T>> {
  const resultSignal = signal<any>(initializeValue ?? null)

  const handleValue = (value: any) => resultSignal.set(value)

  if (cb instanceof Promise) {
    cb.then(handleValue)
  } else if (typeof cb === 'function') {
    effect(() => {
      const res = cb()
      if (res instanceof Promise) {
        res.then(handleValue)
      } else if (isReactiveSignal(res)) {
        effect(() => handleValue(res()))
      } else {
        handleValue(res)
      }
    })
  }

  return resultSignal as any
}
