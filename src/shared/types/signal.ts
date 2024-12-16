export const SignalValueEventName = 'reactive! get signal value'

export interface SignalUpdateFunc<T> {
  (v: T): T
}

export interface ReactiveSignal<T> {
  (): T;
  oldValue: T;
  set(value: T): void;
  update(cb: SignalUpdateFunc<T>): void;
}

export interface SignalValueEventDetail<T = unknown> {
  signalFunction: ReactiveSignal<T>
}
