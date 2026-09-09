import { createComputed, effect, untracked, type EffectCb } from "../../signals";

/** Всё, что умеет владеть эффектами. Структурный тип — чтобы не тянуть сюда BaseElement. */
export type EffectHost = { addEffect(effectCb: VoidFunction): EffectCb };

let currentHost: EffectHost | null = null;

/**
 * Выполняет fn, считая host владельцем всех созданных внутри эффектов.
 * Искать компонент по DOM нельзя: во время render() узлы ещё не вставлены,
 * поэтому «ближайший компонент» — это тот, в чьём render() мы сейчас находимся.
 */
export const withEffectHost = <T>(host: EffectHost, fn: () => T): T => {
  const prevHost = currentHost;
  currentHost = host;
  try {
    return fn();
  } finally {
    currentHost = prevHost;
  }
};

/** Текущий владелец эффектов — нужен when/each, чтобы пересобирать содержимое в его скоупе. */
export const getEffectHost = () => currentHost;

/**
 * Создаёт эффект и отдаёт его текущему компоненту, чтобы тот уничтожил его при отключении.
 * Возвращает сам эффект — он нужен тем, кто должен отписаться сам (см. firstUpdate).
 */
export const hostEffect = (effectCb: VoidFunction): EffectCb => {
  if (!currentHost) {
    console.warn(
      "эффект создан вне render() веб-компонента — оберните код в createRoot(), иначе его некому уничтожить",
      effectCb,
    );
    return effect(effectCb);
  }
  return currentHost.addEffect(effectCb);
};

/**
 * Производное значение, привязанное к текущему компоненту.
 *
 * В отличие от hostEffect не ругается на отсутствие хозяина: computed на уровне модуля —
 * это нормальное производное состояние, живущее столько же, сколько исходные сигналы.
 */
export const computed = <T>(compute: () => T) =>
  createComputed(compute, currentHost ? (cb) => currentHost!.addEffect(cb) : effect);

/**
 * Локальный скоуп эффектов: всё, что создано внутри run(), можно уничтожить одним dispose().
 * Нужен when/each — при пересборке содержимого старые эффекты обязаны умереть.
 */
export type EffectScope = {
  run<T>(fn: () => T): T;
  dispose(): void;
};

/**
 * Корневой владелец эффектов для кода вне компонентов: точка входа приложения,
 * модульное состояние, тесты.
 *
 *   const app = createRoot(() => div({}, counter({ ".value": total })));
 *
 * Без него эффекты, созданные вне render(), некому уничтожить — библиотека об этом
 * предупреждает. dispose приходит первым аргументом, поэтому обычный вызов остаётся
 * однострочным и возвращает саму разметку.
 */
export const createRoot = <T>(fn: (dispose: () => void) => T): T => {
  const scope = createEffectScope();
  return scope.run(() => fn(() => scope.dispose()));
};

export const createEffectScope = (): EffectScope => {
  const owned = new Set<EffectCb>();
  const host: EffectHost = {
    addEffect: (effectCb) => {
      // untracked: содержимое скоупа может собираться внутри отслеживаемого прогона
      // (так работает dynamic). Без сброса эффект стал бы ребёнком внешнего и умирал
      // бы по его перезапуску, хотя уничтожать его — дело скоупа.
      const created = untracked(() => effect(effectCb));
      owned.add(created);
      return created;
    },
  };

  return {
    run: (fn) => withEffectHost(host, fn),
    dispose: () => {
      owned.forEach((effectCb) => effectCb.destroy());
      owned.clear();
    },
  };
};
