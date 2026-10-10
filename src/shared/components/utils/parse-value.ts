export const parseValue = (v: any) => {
  try {
    return JSON.parse(v);
  } catch (e) {
    return v;
  }
};

/**
 * Значение атрибута по типу начального значения пропса. Атрибут — всегда строка,
 * и без подсказки `<x-switch disabled>` дал бы "", а `label="42"` — число.
 *
 * - boolean: как в HTML — есть атрибут, значит true; "false" тоже читается как false;
 *   удалённый атрибут — false.
 * - number: Number(), а нечисло откатывается к начальному значению.
 * - string: строка как есть.
 * - всё остальное (объекты, массивы, null): JSON, а что не разобралось — строка.
 */
export const parseAttribute = (raw: string | null, initial: unknown): unknown => {
  if (typeof initial === "boolean") return raw !== null && raw !== "false";
  if (raw === null) return initial;
  if (typeof initial === "number") {
    const parsed = Number(raw);
    return raw.trim() === "" || Number.isNaN(parsed) ? initial : parsed;
  }
  if (typeof initial === "string") return raw;
  return parseValue(raw);
};

/** Обратное направление для reflect: null — атрибута быть не должно. */
export const serializeAttribute = (value: unknown): string | null => {
  if (value === true) return "";
  if (value === false || value === null || value === undefined) return null;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};
