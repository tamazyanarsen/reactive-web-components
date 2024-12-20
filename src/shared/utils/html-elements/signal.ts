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
  const signalList = new Set<ReactiveSignal<unknown>>();
  (function () {
    const signalCallback = (event: Event | CustomEvent<SignalValueEventDetail>) => {
      if (isCustomEvent<SignalValueEventDetail>(event)) {
        console.log('is cb registered', signalList.has(event.detail.signalFunction))
        if (signalList.has(event.detail.signalFunction)) return;
        const oldSetfunction = event.detail.signalFunction.set
        console.log('register effect for', cb)
        event.detail.signalFunction.set = (...args) => {
          oldSetfunction(...args)
          cb()
        }
        signalList.add(event.detail.signalFunction)
      }
    }
    window.addEventListener(SignalValueEventName, signalCallback)
    cb()
    window.removeEventListener(SignalValueEventName, signalCallback)
  })()
}
