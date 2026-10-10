import type { EffectCb } from "./types";

/**
 * Кто забирает эффект, созданный вне прогона другого эффекта. Сигналы ничего не знают
 * о компонентах, поэтому слой компонентов вешает сюда свой обработчик: эффект, созданный
 * в render() обычным effect(), достаётся компоненту и умирает вместе с ним.
 *
 * Модуль внутренний и не реэкспортируется из пакета.
 */
let adopter: ((effectCb: EffectCb) => void) | null = null;

export const setEffectAdopter = (fn: (effectCb: EffectCb) => void) => {
  adopter = fn;
};

export const adoptEffect = (effectCb: EffectCb) => adopter?.(effectCb);
