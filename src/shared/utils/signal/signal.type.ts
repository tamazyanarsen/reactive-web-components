import { UnwrapPromise } from "./helpers.types";

export interface SignalUpdateFunc<T> {
	(v: Readonly<T>): T
}

export type CompareFn<T> = (oldValue: T, newValue: T) => boolean

export interface ReactiveSignal<T> {
	(): T;
	oldValue: Readonly<T>;
	initValue: Readonly<T>;
	set(value: T): void;
	forceSet(value: T): void;
	setCompareFn(compareFn: CompareFn<T>): ReactiveSignal<T>;
	update(cb: SignalUpdateFunc<T>): void;
	clearSubscribers(): void;
	peek(): Readonly<T>
	pipe<R>(
		fn: (sg: T) => R
	): ReactiveSignal<R extends Promise<any> ? UnwrapPromise<R> : UnwrapSignal<R>>;
}

export type UnwrapSignal<T> = T extends ReactiveSignal<infer U> ? U : T;