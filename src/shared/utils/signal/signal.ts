import { projectLog } from "../helpers";
import { IsPromise, IsPromiseFunction, UnwrapPromise } from "./helpers.types";
import {
  ShouldUpdateFn,
  ReactiveSignal,
  SignalUpdateFunc,
  UnwrapSignal,
} from "./signal.type";

export const REACTIVE_SIGNAL_MARKER = Symbol.for("reactive-signal");

export type EffectCb = (() => void) & {
  fake?: boolean;
  effectId?: string;
  children?: Set<EffectCb>;
  parent?: WeakRef<EffectCb>;
  cleanupSet?: Set<() => void>;
  component?: WeakRef<HTMLElement>;
  status: "active" | "inactive";
  destroy?: () => void;
};

const cbStack: EffectCb[] = [];

export const removeEffect = (effectCb: EffectCb) => {
  effectCb.children?.forEach((child) => child.destroy?.());
  effectCb.children?.clear();
  effectCb.cleanupSet?.forEach((clean) => clean());
  effectCb.cleanupSet?.clear();
};

export function signal<T = unknown>(
  initValue: T,
  signalConfig?: {
    shouldUpdateFn?: ShouldUpdateFn<T>;
    name?: string;
  },
): ReactiveSignal<T> {
  let currentValue = initValue;
  let globalShouldUpdateFn = signalConfig?.shouldUpdateFn || (() => true);

  const signalSubscribers = new Set<EffectCb>();

  function result() {
    const currCb = cbStack[cbStack.length - 1] as EffectCb | undefined;
    if (
      currCb &&
      !currCb.fake &&
      !signalSubscribers.has(currCb) &&
      currCb.status === "active"
    ) {
      signalSubscribers.add(currCb);
      currCb.cleanupSet?.add(() => signalSubscribers.delete(currCb));
    }
    if (!signalConfig?.name && currCb?.effectId)
      result.setName(currCb.effectId as string);

    return currentValue;
  }

  (result as any)[REACTIVE_SIGNAL_MARKER] = true;

  result.signalId = `${signalConfig?.name || ""}_${Math.random().toString(36).substring(2, 15)}`;

  result.setName = function (name: string) {
    result.signalId = `${name}_${Math.random().toString(36).substring(2, 15)}`;
    return result;
  };

  result.setShouldUpdateFn = function (shouldUpdateFn: ShouldUpdateFn<T>) {
    globalShouldUpdateFn = shouldUpdateFn;
    return result;
  };

  result.getSubscribers = function () {
    return signalSubscribers;
  };

  result.peek = function () {
    return Object.freeze(currentValue);
  };

  result.initValue = Object.freeze(initValue);

  result.forceSet = function (value: T) {
    currentValue = value;
    const subs = [...signalSubscribers];
    subs.forEach((s) => s.destroy?.());
    queueMicrotask(() => subs.forEach((s) => effect(s)));
  };

  result.set = function (
    value: T,
    shouldUpdateFn: ShouldUpdateFn<T> = globalShouldUpdateFn,
  ) {
    if (currentValue !== value && shouldUpdateFn(currentValue, value)) {
      result.forceSet(value);
    }
  };

  result.update = function (cb: SignalUpdateFunc<T>) {
    result.set(cb(currentValue));
  };

  result.pipe = <R>(
    fn: (sg: T) => R,
    pipeConfig?: {
      name?: string;
    },
  ) => {
    if (pipeConfig?.name) result.setName(pipeConfig.name);
    const resSignal = signal<
      R extends Promise<any> ? UnwrapPromise<R> : UnwrapSignal<R>
    >(null as any);

    effect(
      () => {
        const signalRes = result();
        const effectId = "pipe_effect";
        effect(
          () => {
            const fnResult = fn(signalRes);
            const innerEffectId = "pipe_effect_inner";
            if (fnResult instanceof Promise) {
              let stale = false;
              const currCb = cbStack[cbStack.length - 1] as
                | EffectCb
                | undefined;
              currCb?.cleanupSet?.add(() => {
                stale = true;
              });
              fnResult.then((v) => {
                if (!stale) resSignal.set(v);
              });
            } else {
              if (isReactiveSignal(fnResult)) {
                effect(() => resSignal.set(fnResult()), {
                  name: innerEffectId,
                });
              } else {
                resSignal.set(fnResult as any);
              }
            }
          },
          { name: effectId },
        );
      },
      { name: pipeConfig?.name || `pipe_${result.signalId}` },
    );
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
  const randomId = `${config?.name || ""}_${Math.random().toString(36).substring(2, 15)}`;
  projectLog("current effect", `%c${randomId}%c`);

  const effectCb: EffectCb = cb as EffectCb;
  effectCb.status = "active";
  effectCb.children = new Set();
  effectCb.effectId = randomId;
  effectCb.cleanupSet = new Set();

  const parentCb = cbStack[cbStack.length - 1] as EffectCb | undefined;
  if (effectCb.parent) {
    effectCb.parent?.deref()?.children?.add(effectCb);
  } else if (parentCb) {
    parentCb.children?.add(effectCb);
    effectCb.parent = new WeakRef(parentCb);
  }

  effectCb.destroy = () => {
    removeEffect(effectCb);
    effectCb.parent?.deref()?.children?.delete(effectCb);
    effectCb.status = "inactive";
  };

  cbStack.push(effectCb);
  try {
    effectCb();
  } catch (error) {
    console.error("Error in effect:", error);
  } finally {
    cbStack.pop();
  }

  return effectCb;
}

export const isReactiveSignal = <R extends ReactiveSignal<any>>(
  v: R | any,
): v is R =>
  Boolean(v) &&
  ["object", "function"].includes(typeof v) &&
  REACTIVE_SIGNAL_MARKER in v;

/**
 * Reactive String (rs). Creates a dependent string signal from a source.
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

// createSignal with conditional types instead of overloads
export function createSignal<
  T extends Promise<any> | (() => any),
  I extends
    | UnwrapPromise<T extends () => infer R ? UnwrapSignal<R> : T>
    | undefined,
>(
  cb: T,
  initializeValue?: I,
): I extends undefined
  ? IsPromise<T> extends true
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

export function onCleanup(fn: () => void): void {
  const parentCb = cbStack[cbStack.length - 1] as EffectCb | undefined;
  parentCb?.cleanupSet?.add(fn);
}
