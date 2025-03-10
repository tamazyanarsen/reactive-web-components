import { SignalValueEventName, ReactiveSignal, SignalValueEventDetail, SignalUpdateFunc } from "../../types/signal";

const isCustomEvent = <T = unknown>(event: Event | CustomEvent<T>): event is CustomEvent<T> => 'detail' in event;

export function signal<T = unknown>(initValue: T): ReactiveSignal<T> {
  function result() {
    dispatchEvent(new CustomEvent<SignalValueEventDetail<T>>(SignalValueEventName, {
      detail: {
        signalFunction: result
      }
    }))
    return initValue
  }
  result.oldValue = initValue
  result.set = function (value: T) {
    result.oldValue = initValue
    initValue = value
  }
  result.update = function (cb: SignalUpdateFunc<T>) {
    result.set(cb(initValue))
  }
  return result
}

export function effect(cb: () => void) {
  // TODO: заменить на uuid
  const effectId = Math.random().toString();
  const currentEffectId = localStorage.getItem('effectId');
  localStorage.setItem('effectId', effectId);
  console.log('create effect', effectId, cb);

  const signalList = new Set<ReactiveSignal<unknown>>();
  (function () {
    const signalCallback = (event: Event | CustomEvent<SignalValueEventDetail>) => {
      if (effectId !== localStorage.getItem('effectId')) {
        console.log({ effectId }, 'another effect running');
        return;
      };
      if (isCustomEvent<SignalValueEventDetail>(event)) {
        console.log({ effectId }, 'is cb registered', signalList.has(event.detail.signalFunction))
        if (signalList.has(event.detail.signalFunction)) return;
        const oldSetfunction = event.detail.signalFunction.set
        console.log('call effect', effectId);
        event.detail.signalFunction.set = (...args) => {
          oldSetfunction(...args)
          cb()
        }
        signalList.add(event.detail.signalFunction)
      }
    }
    window.addEventListener(SignalValueEventName, signalCallback)
    cb()
    window.removeEventListener(SignalValueEventName, signalCallback);
    if (currentEffectId) localStorage.setItem('effectId', currentEffectId);
    else localStorage.removeItem('effectId');
  })()
}


export const isReactiveSignal = <T>(v: ReactiveSignal<T> | any): v is ReactiveSignal<T> => ['object', 'function'].includes(typeof v) && 'set' in v

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
}
