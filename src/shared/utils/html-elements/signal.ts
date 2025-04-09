import { ReactiveSignal, SignalUpdateFunc } from "../../types/signal";

const effectStack: (() => void)[] = []

export function signal<T = unknown>(initValue: T): ReactiveSignal<T> {
  const subscribers = new Set<() => void>()
  function result() {
    const currCb = effectStack[effectStack.length - 1]
    if (currCb) subscribers.add(currCb)
    return initValue
  }
  result.oldValue = Object.freeze(initValue)
  result.set = function (value: T) {
    if (initValue !== value) {
      result.oldValue = Object.freeze(initValue)
      initValue = value
      subscribers.forEach(cb => cb())
    }
  }
  result.update = function (cb: SignalUpdateFunc<T>) {
    result.set(cb(initValue))
  }
  return result
}

export function effect(cb: () => void) {
  effectStack.push(cb)
  cb()
  effectStack.pop()
}

export const isReactiveSignal = <R extends ReactiveSignal<any>>(v: R | any): v is R => ['object', 'function'].includes(typeof v) && 'set' in v && 'oldValue' in v && 'update' in v

/**
 * Reactive String (rs). Создаёт зависимый string сигнал от источника.
 * @param strings
 * @param values
 * @returns
 *
 * @example
 * const source: ReactiveSignal<string> = signal('test')
 * const dependent: ReactiveSignal<string> = rs`abc-${source}`
 * console.log(dependent())
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
