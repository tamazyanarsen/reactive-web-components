import { SIGNAL, type ReadonlySignal } from "./types";

/**
 * Реактивный источник (signal или computed). Проверка по бренду, а не по наличию `set`:
 * иначе computed не опознавался бы, а обычная функция-значение опознавалась бы ошибочно.
 */
export const isSignal = (value: unknown): value is ReadonlySignal<unknown> =>
  typeof value === "function" && SIGNAL in value;
