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
  // console.log('from effect', cb.toString().match(/(\w+)\(\)/gm))

  const signalCallback = (event: Event | CustomEvent<SignalValueEventDetail>) => {
    if (isCustomEvent<SignalValueEventDetail>(event)) {
      console.log('register effect for', cb)
      const oldSetfunction = event.detail.signalFunction.set
      event.detail.signalFunction.set = (...args) => {
        oldSetfunction(...args)
        cb()
      }
    }
  }
  window.addEventListener(SignalValueEventName, signalCallback)
  cb()
  window.removeEventListener(SignalValueEventName, signalCallback)
}
