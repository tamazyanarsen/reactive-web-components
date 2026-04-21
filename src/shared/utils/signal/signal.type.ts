import { UnwrapPromise } from "./helpers.types";

export interface SignalUpdateFunc<T> {
  (v: Readonly<T>): T;
}

export type ShouldUpdateFn<T> = (oldValue: T, newValue: T) => boolean;
/** @deprecated Use ShouldUpdateFn instead */
export type CompareFn<T> = ShouldUpdateFn<T>;

export interface ReactiveSignal<T> {
  (): T;
  initValue: Readonly<T>;
  set(value: T): void;
  forceSet(value: T): void;
  setShouldUpdateFn(shouldUpdateFn: ShouldUpdateFn<T>): ReactiveSignal<T>;
  update(cb: SignalUpdateFunc<T>): void;
  // clearSubscribers(): void;
  peek(): Readonly<T>;
  setName(name: string): ReactiveSignal<T>;
  getSubscribers(): Set<() => void> | undefined;
  pipe<R>(
    fn: (sg: T) => R,
    config?: {
      name?: string;
    },
  ): ReactiveSignal<
    R extends Promise<any> ? UnwrapPromise<R> : UnwrapSignal<R>
  >;
}

export type UnwrapSignal<T> = T extends ReactiveSignal<infer U> ? U : T;
