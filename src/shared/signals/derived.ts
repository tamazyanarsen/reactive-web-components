import { untracked } from "./signal";
import { SIGNAL, type MaybeReactive, type ReadonlySignal } from "./types";

/**
 * Помечает обычный геттер как реактивный источник — без эффекта и без сигнала внутри.
 *
 *   const full = derived(() => `${first()} ${last()}`);
 *
 * Отличие от computed: значение не запоминается, compute выполняется на каждое чтение,
 * зато нет ни эффекта, ни владельца — такой источник живёт сколько угодно и ничего не
 * протекает. Годится для дешёвых выражений; для тяжёлых берите computed.
 */
export const derived = <T>(compute: () => T): ReadonlySignal<T> => {
  const read = () => compute();
  read.peek = () => untracked(compute);
  read[SIGNAL] = true as const;
  return read as ReadonlySignal<T>;
};

/** Читает источник, если он реактивный, иначе отдаёт значение как есть. */
const read = <T>(source: MaybeReactive<T>): T =>
  typeof source === "function" ? (source as () => T)() : source;

/**
 * Реактивная строка: rs`btn btn-${size} ${() => (active() ? "on" : "off")}`.
 *
 * Значения могут быть статикой, сигналами или обычными функциями. Результат — источник,
 * который годится в дети, атрибуты и классы.
 */
export const rs = (
  strings: TemplateStringsArray,
  ...values: MaybeReactive<unknown>[]
): ReadonlySignal<string> =>
  derived(() =>
    strings.reduce(
      (acc, chunk, index) =>
        acc + chunk + (index < values.length ? String(read(values[index]) ?? "") : ""),
      "",
    ),
  );

/** Значения источников кортежем — то, что вернёт combine. */
type Values<T extends readonly MaybeReactive<unknown>[]> = {
  [K in keyof T]: T[K] extends MaybeReactive<infer V> ? V : never;
};

/**
 * Собирает несколько источников в один кортеж:
 *
 *   const both = combine(width, height);
 *   effect(() => { const [w, h] = both(); ... });
 *
 * Читает все источники на каждое чтение, поэтому подписка охватывает их все.
 * Массив создаётся заново каждый раз — сравнивать результат по ссылке смысла нет.
 */
export const combine = <T extends readonly MaybeReactive<unknown>[]>(
  ...sources: T
): ReadonlySignal<Values<T>> => derived(() => sources.map(read) as unknown as Values<T>);
