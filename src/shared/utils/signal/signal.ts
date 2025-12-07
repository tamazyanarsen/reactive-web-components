import { projectLog } from '../helpers';
import { IsPromise, IsPromiseFunction, UnwrapPromise } from './helpers.types';
import {
	CompareFn,
	ReactiveSignal,
	SignalUpdateFunc,
	UnwrapSignal,
} from './signal.type';
export interface Effect {
	(): void;
	cleanupFns: Set<() => void>;
	children: Set<Effect>;
	effectId: string;
	status: 'active' | 'inactive';
	destroy: () => void;
}

// список вложенных эффектов
const effectStack: Effect[] = [];

// Рекурсивная функция для очистки дочерних эффектов
const cleanupChildEffects = (child: Effect) => {
	// Сначала очищаем cleanup функции самого дочернего эффекта
	child.cleanupFns.forEach((cleanupFn) => cleanupFn());
	// Затем рекурсивно очищаем всех его детей
	child.children.forEach((grandChild) => {
		grandChild.destroy();
	});
	// Очищаем Set детей после их удаления
	child.children.clear();
	child.cleanupFns.clear();
};

export function signal<T = unknown>(
	initValue: T,
	config?: {
		signalCompareFn?: CompareFn<T>;
		name?: string;
	}
): ReactiveSignal<T> {
	let globalCompareFn = config?.signalCompareFn || (() => true);
	const subscribers = new Set<Effect>();

	function result() {
		const currCb = effectStack[effectStack.length - 1];

		if (
			currCb &&
			!subscribers.has(currCb) &&
			!('fake' in currCb && currCb.fake)
		) {
			subscribers.add(currCb);
			currCb.cleanupFns.add(() => {
				subscribers.delete(currCb);
			});
		}

		return initValue;
	}

	let signalId = '';
	Object.defineProperty(result, 'signalId', {
		get: () => {
			return signalId;
		},
		set: (value: string) => {
			signalId = value;
		},
	});

	result.signalId = `${config?.name || ''}_${Math.random()
		.toString(36)
		.substring(2, 15)}`;

	result.setName = function (name: string) {
		result.signalId = `${name}_${Math.random()
			.toString(36)
			.substring(2, 15)}`;
		return result;
	};

	result.setCompareFn = function (compareFn: CompareFn<T>) {
		globalCompareFn = compareFn;
		return result;
	};

	result.clearSubscribers = function () {
		subscribers.clear();
	};

	result.getSubscribers = function () {
		return subscribers;
	};

	result.peek = function () {
		return Object.freeze(initValue);
	};

	result.initValue = Object.freeze(initValue);

	result.forceSet = function (value: T) {
		initValue = value;
		subscribers.forEach((cb) => {
			cleanupChildEffects(cb);
			Promise.resolve().then(() => {
				effectStack.push(cb);
				cb();
				effectStack.pop();
			});
		});
	};

	result.set = function (
		value: T,
		setCompareFn: CompareFn<T> = globalCompareFn
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
		config?: {
			name?: string;
		}
	) => {
		const resSignal = signal<
			R extends Promise<any> ? UnwrapPromise<R> : UnwrapSignal<R>
		>(null as any);
		effect(() => {
			const signalRes = result();
			effect(() => {
				const fnResult = fn(signalRes);
				if (fnResult instanceof Promise) {
					fnResult.then((v) => resSignal.set(v));
				} else {
					if (isReactiveSignal(fnResult)) {
						effect(() => resSignal.set(fnResult()));
					} else {
						resSignal.set(fnResult as any);
					}
				}
			}, config);
		});
		return resSignal;
	};

	return result;
}

export function effect(
	cb: () => void,
	config?: {
		name?: string;
	}
) {
	const randomId = `${config?.name || ''}_${Math.random()
		.toString(36)
		.substring(2, 15)}`;
	projectLog('current effect', `%c${randomId}%c`);

	const parentCb = effectStack[effectStack.length - 1];
	// if (parentCb && parentCb.status === 'inactive') {
	// 	return;
	// }

	const newEffect: Effect = cb as any;
	newEffect.cleanupFns = new Set<() => void>();
	newEffect.children = new Set<Effect>();
	newEffect.status = 'active';
	newEffect.effectId = randomId;
	newEffect.destroy = () => {
		newEffect.status = 'inactive';
		cleanupChildEffects(newEffect);
		parentCb?.children.delete(newEffect);
	};

	parentCb?.children.add(newEffect);

	effectStack.push(newEffect);
	newEffect();
	effectStack.pop();

	return newEffect;
}

export const isReactiveSignal = <R extends ReactiveSignal<any>>(
	v: R | any
): v is R =>
	Boolean(v) &&
	['object', 'function'].includes(typeof v) &&
	'set' in v &&
	'update' in v &&
	'forceSet' in v;

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

// Функция createSignal с условными типами вместо перегрузок
export function createSignal<
	T extends Promise<any> | (() => any),
	I extends
		| UnwrapPromise<T extends () => infer R ? UnwrapSignal<R> : T>
		| undefined
>(
	cb: T,
	initializeValue?: I
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
	} else if (typeof cb === 'function') {
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
