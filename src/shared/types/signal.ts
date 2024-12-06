export const SignalValueEventName = 'reactive! get signal value'

export interface ReactiveSignal<T> {
  (): T;
  set(value: T): void;
}

export interface SignalValueEventDetail<T = unknown> {
  signalFunction: ReactiveSignal<T>
}
