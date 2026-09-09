import type { MaybeReactive } from "../../signals";
import { camelToKebab } from "./case";
import { hostEffect } from "./render-context";

/** false/null/undefined снимают атрибут, true ставит пустой (как у disabled/checked). */
export type AttrValue = string | number | boolean | null | undefined;

/** Произвольные атрибуты: data-*, aria-*, role и всё, чего нет среди свойств. */
export type AttrMap = Record<string, MaybeReactive<AttrValue>>;

export type StyleValue = string | number | null | undefined;

/** Инлайновые стили. Ключ — camelCase, kebab-case или --custom-property. */
export type StyleMap = Record<string, MaybeReactive<StyleValue>>;

export type AttrOption = {
  attrs?: AttrMap;
  style?: StyleMap;
  /**
   * Переключает видимость через display, не трогая DOM: узлы, состояние и эффекты
   * остаются живыми. Когда содержимое надо именно уничтожить — это when.
   */
  show?: MaybeReactive<boolean>;
};

/**
 * Подписывает apply на источник, если значение реактивное; иначе применяет один раз.
 * Атрибут и стиль функцией быть не могут, поэтому любая функция здесь — источник,
 * и бренд сигнала проверять не нужно: `attrs: { title: () => user().name }` работает.
 */
const bind = <T>(value: MaybeReactive<T>, apply: (v: T) => void) => {
  if (typeof value === "function") {
    hostEffect(() => apply((value as () => T)()));
    return;
  }
  apply(value as T);
};

const setAttr = (element: Element, name: string, value: AttrValue) => {
  if (value === null || value === undefined) {
    element.removeAttribute(name);
    return;
  }

  // ARIA требует буквальные "true"/"false": пустое значение невалидно, а отсутствие
  // атрибута means «не применимо» — это не то же самое, что aria-checked="false".
  if (name.startsWith("aria-")) {
    element.setAttribute(name, String(value));
    return;
  }

  // Для остальных булево работает как у disabled/hidden: есть атрибут или нет.
  if (value === false) {
    element.removeAttribute(name);
    return;
  }
  element.setAttribute(name, value === true ? "" : String(value));
};

export const applyAttrs = (element: Element, attrs: AttrMap) => {
  for (const [name, value] of Object.entries(attrs)) {
    bind(value, (v) => setAttr(element, name, v));
  }
};

const setStyle = (style: CSSStyleDeclaration, property: string, value: StyleValue) => {
  if (value === null || value === undefined || value === "") {
    style.removeProperty(property);
    return;
  }
  // setProperty вместо записи в style[prop]: единственный способ выставить --переменные,
  // и он же работает для обычных свойств в kebab-case.
  style.setProperty(property, String(value));
};

/**
 * display: none, пока условие ложно.
 *
 * Запоминаем инлайновый display, который был до нас, и возвращаем его при показе:
 * иначе `div({ show, style: { display: "flex" } })` после первого скрытия остался бы
 * без своего display.
 */
export const applyShow = (element: Element, visible: MaybeReactive<boolean>) => {
  const style = (element as HTMLElement).style;
  if (!style) return;

  let restore: string | null = null;

  bind(visible, (isVisible) => {
    if (isVisible) {
      // Ничего не скрывали — значит и восстанавливать нечего, а display мог поставить
      // style: снимать его нельзя.
      if (restore === null) return;

      // Пустая строка означала «инлайнового display не было» — тогда просто снимаем.
      if (restore) style.setProperty("display", restore);
      else style.removeProperty("display");
      restore = null;
      return;
    }

    // Запоминаем один раз: повторное скрытие уже видит display: none.
    if (restore === null) restore = style.getPropertyValue("display") || "";
    style.setProperty("display", "none");
  });
};

export const applyStyle = (element: Element, styles: StyleMap) => {
  const style = (element as HTMLElement).style;
  if (!style) return;

  for (const [key, value] of Object.entries(styles)) {
    // Кастомные свойства регистрозависимы, их трогать нельзя; остальное — в kebab-case.
    const property = key.startsWith("--") ? key : camelToKebab(key);
    bind(value, (v) => setStyle(style, property, v));
  }
};
