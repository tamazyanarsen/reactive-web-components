import { hostEffect } from "./render-context";

/** Бренд результата cls`...`: без него { class: cls`a` } попал бы в ветку условий. */
export const CLASS_CONFIG: unique symbol = Symbol("rwc.class-config");

/** Источник токенов: сигнал строки или произвольный геттер. */
export type ClassGetter = () => string | false | null | undefined;

/** Условие в объектной форме: токен стоит, пока значение истинно. */
export type ClassCondition = boolean | null | undefined | (() => boolean | null | undefined);

export type ClassRecord = Record<string, ClassCondition>;

/** Результат cls`...`: и самостоятельный конфиг элемента, и значение для ключа class. */
export type ClassConfig = { class: ClassValue; [CLASS_CONFIG]: true };

export type ClassValue =
  | string
  | false
  | null
  | undefined
  | ClassGetter
  | ClassRecord
  | ClassConfig
  | readonly ClassValue[];

/** Кусок конфига элемента. Partial — чтобы спред { ...cls`a`, ".id": "x" } не ловил excess property check. */
export type ClassOption = Partial<ClassConfig>;

// --- учёт токенов ---------------------------------------------------------------

/**
 * Сколько источников держит токен на элементе. Без счётчика источник, снимающий свой
 * токен, стирал бы такой же токен соседнего источника или статики.
 */
const tokenCounts = new WeakMap<Element, Map<string, number>>();

const countsOf = (element: Element) => {
  const existing = tokenCounts.get(element);
  if (existing) return existing;
  const counts = new Map<string, number>();
  tokenCounts.set(element, counts);
  return counts;
};

const retain = (element: Element, tokens: ReadonlySet<string>) => {
  const counts = countsOf(element);
  for (const token of tokens) {
    const next = (counts.get(token) ?? 0) + 1;
    counts.set(token, next);
    if (next === 1) element.classList.add(token);
  }
};

const release = (element: Element, tokens: ReadonlySet<string>) => {
  const counts = countsOf(element);
  for (const token of tokens) {
    const next = (counts.get(token) ?? 1) - 1;
    if (next > 0) {
      counts.set(token, next);
      continue;
    }
    counts.delete(token);
    element.classList.remove(token);
  }
};

const WHITESPACE = /\s+/;

/** classList.add падает на пустой строке и на токене с пробелом — режем заранее. */
const tokenize = (raw: unknown, into: Set<string>) => {
  if (!raw) return into;
  for (const token of String(raw).split(WHITESPACE)) if (token) into.add(token);
  return into;
};

// --- разбор значения ---------------------------------------------------------------

const isClassConfig = (value: object): value is ClassConfig => CLASS_CONFIG in value;

const walk = (value: ClassValue, statics: Set<string>, sources: ClassGetter[]): void => {
  if (!value) return; // "", false, null, undefined

  if (typeof value === "string") {
    tokenize(value, statics);
    return;
  }

  // Сигнал — тоже функция, поэтому ветка стоит раньше всего объектного.
  if (typeof value === "function") {
    sources.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value as readonly ClassValue[]) walk(item, statics, sources);
    return;
  }

  // Строго раньше ветки условий: у cls`...` есть ключ "class",
  // иначе он стал бы буквальным именем класса.
  if (isClassConfig(value)) {
    walk(value.class, statics, sources);
    return;
  }

  for (const [token, condition] of Object.entries(value)) {
    if (typeof condition === "function") {
      sources.push(() => (condition() ? token : false));
      continue;
    }
    if (condition) tokenize(token, statics);
  }
};

/** Привязывает один реактивный источник: он владеет только своими токенами. */
const bindTokens = (element: Element, read: ClassGetter) => {
  /** Что этот источник поставил в прошлый раз. Диффим наборы, а не строку атрибута. */
  let owned: ReadonlySet<string> = new Set();

  hostEffect(() => {
    // Читаем безусловно и первой строкой: ядро трекает зависимости только на первом
    // прогоне, ранний выход навсегда отписал бы эффект от сигнала.
    const raw = read();
    const next = tokenize(raw, new Set<string>());

    // retain до release: токен, живущий в обоих наборах, не покидает classList даже
    // на мгновение — иначе перезапустились бы CSS-transition и animation.
    retain(element, next);
    release(element, owned);
    owned = next;
  });
};

export const applyClass = (element: Element, value: ClassValue) => {
  const statics = new Set<string>();
  const sources: ClassGetter[] = [];

  // Сначала обходим всё дерево значения и лишь потом создаём эффекты: так они заведомо
  // создаются последовательно, а не один внутри другого (ядро это запрещает).
  walk(value, statics, sources);

  if (statics.size) retain(element, statics);
  for (const source of sources) bindTokens(element, source);
};

// --- тег cls ------------------------------------------------------------------------

/** Часть сегмента, пригодная для склейки в один токен. */
const isJoinable = (part: ClassValue): part is string | ClassGetter =>
  typeof part === "string" || typeof part === "function";

const resolvePart = (part: string | ClassGetter) => {
  if (typeof part === "string") return part;
  const value = part();
  return value ? String(value) : "";
};

/** Склеивает написанное слитно: `btn-${size}` -> один токен "btn-lg", а не "btn-" и "lg". */
const joinSegment = (segment: ClassValue[]): ClassValue => {
  if (segment.length === 1) return segment[0];
  // Объект/массив внутри слитного куска склеить нельзя — оставляем части раздельно.
  if (!segment.every(isJoinable)) return segment;
  if (segment.every((part) => typeof part === "string")) return segment.join("");
  return () => segment.map(resolvePart).join("");
};

/**
 * Класс без конфига: div(cls`card ${themeSignal}`, "текст").
 *
 * Возврат — объектный литерал, потому что splitConfigAndChildren признаёт конфигом
 * только объект с Object.prototype. Написанное слитно склеивается в один токен,
 * разделённое пробелом остаётся разными токенами.
 */
export const cls = (strings: TemplateStringsArray, ...values: ClassValue[]): ClassConfig => {
  const parts: ClassValue[] = [];
  let segment: ClassValue[] = [];

  const flush = () => {
    if (segment.length) parts.push(joinSegment(segment));
    segment = [];
  };

  strings.forEach((chunk, index) => {
    const words = chunk.split(WHITESPACE);

    // Первое слово прилипает к текущему сегменту...
    const first = words[0];
    if (first) segment.push(first);

    if (words.length > 1) {
      // ...а пробел за ним сегмент закрывает.
      flush();
      for (const word of words.slice(1, -1)) if (word) parts.push(word);
      const last = words[words.length - 1];
      if (last) segment.push(last);
    }

    // Интерполяция прилипает к текущему сегменту. За последним куском её нет.
    if (index < values.length) segment.push(values[index]);
  });

  flush();
  return { class: parts, [CLASS_CONFIG]: true };
};
