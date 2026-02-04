import { projectLog } from "../helpers";
import { IsPromise, IsPromiseFunction, UnwrapPromise } from "./helpers.types";
import {
  CompareFn,
  ReactiveSignal,
  SignalUpdateFunc,
  UnwrapSignal,
} from "./signal.type";

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

const callCb = (cb: EffectCb) => {
  if (cb.status === "active") {
    removeEffect(cb);
    cbStack.push(cb);
    try {
      cb();
    } catch (error) {
      // Логируем ошибку, но продолжаем выполнение остальных эффектов
      console.error("Error in effect:", error);
    } finally {
      cbStack.pop();
    }
  }
};

const pendingEffects = new Set<EffectCb>();
let isPending = false;

export const sheduleEffect = (effectCb: EffectCb) => {
  if (effectCb.status === "active") {
    pendingEffects.add(effectCb);
  }
  if (!isPending) {
    isPending = true;
    queueMicrotask(() => {
      isPending = false;
      projectLog("pendingEffects.size", pendingEffects.size);
      const effectList = Array.from(pendingEffects);
      pendingEffects.clear();

      effectList.forEach((cb) => {
        callCb(cb);
      });

      projectLog("after ------ pendingEffects.size", pendingEffects.size);
    });
  }
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
    signalCompareFn?: CompareFn<T>;
    name?: string;
  },
): ReactiveSignal<T> {
  let globalCompareFn = signalConfig?.signalCompareFn || (() => true);

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

    return initValue;
  }

  result.signalId = `${signalConfig?.name || ""}_${Math.random().toString(36).substring(2, 15)}`;

  result.setName = function (name: string) {
    result.signalId = `${name}_${Math.random().toString(36).substring(2, 15)}`;
    return result;
  };

  result.setCompareFn = function (compareFn: CompareFn<T>) {
    globalCompareFn = compareFn;
    return result;
  };

  result.clearSubscribers = function () {
    signalSubscribers.clear();
  };

  result.getSubscribers = function () {
    return signalSubscribers;
  };

  result.peek = function () {
    return Object.freeze(initValue);
  };

  result.initValue = Object.freeze(initValue);

  result.forceSet = function (value: T) {
    initValue = value;
    signalSubscribers.forEach((cb) => sheduleEffect(cb));
    // signalSubscribers.forEach((cb) => queueMicrotask(() => callCb(cb)));
    // signalSubscribers.forEach((cb) => {
    //   removeEffect(cb);
    //   Promise.resolve().then(() => {
    //     cbStack.push(cb);
    //     cb();
    //     cbStack.pop();
    //   });
    // });
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
              fnResult.then((v) => resSignal.set(v));
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
  const parentCb = cbStack[cbStack.length - 1] as EffectCb | undefined;
  if (parentCb) {
    parentCb.children?.add(effectCb);
    effectCb.parent = new WeakRef(parentCb);
    effectCb.destroy = () => {
      removeEffect(effectCb);
      parentCb.children?.delete(effectCb);
      effectCb.destroy = undefined;
      effectCb.status = "inactive";
    };
  }
  effectCb.cleanupSet = new Set();

  cbStack.push(effectCb);
  effectCb();
  cbStack.pop();

  return effectCb;
}

export const isReactiveSignal = <R extends ReactiveSignal<any>>(
  v: R | any,
): v is R =>
  Boolean(v) &&
  ["object", "function"].includes(typeof v) &&
  "set" in v &&
  "update" in v &&
  "forceSet" in v &&
  "signalId" in v;

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
