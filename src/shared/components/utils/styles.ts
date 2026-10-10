/**
 * Стили компонента: строка CSS или готовый CSSStyleSheet, либо массив того и другого.
 * Задаются как `static styles` на классе компонента.
 */
export type ComponentStyles = string | CSSStyleSheet | readonly (string | CSSStyleSheet)[];

/**
 * Один CSSStyleSheet на одну строку CSS: у всех экземпляров компонента лист общий,
 * поэтому браузер разбирает CSS один раз, а не на каждый экземпляр (как было бы
 * с <style> внутри render()).
 */
const sheetCache = new Map<string, CSSStyleSheet>();

/**
 * Конструируемые таблицы стилей есть везде, кроме старых движков. Проверяем один раз:
 * без них остаётся путь через <style>, он даёт тот же результат, но лист не общий.
 */
const supportsConstructableSheets = (() => {
  if (typeof CSSStyleSheet !== "function") return false;
  try {
    new CSSStyleSheet().replaceSync("");
    return "adoptedStyleSheets" in Document.prototype;
  } catch {
    return false;
  }
})();

/**
 * Шаблонный тег для CSS. Ничего не делает с текстом — нужен ради подсветки и
 * форматирования в редакторе: css`:host { display: block }`.
 */
export const css = (strings: TemplateStringsArray, ...values: unknown[]) =>
  strings.reduce((acc, chunk, index) => acc + chunk + (index < values.length ? String(values[index]) : ""), "");

/** Исходный текст листа: cssRules в разных DOM-реализациях восстанавливают его неточно. */
const sheetSource = new WeakMap<CSSStyleSheet, string>();

const toSheet = (source: string) => {
  const cached = sheetCache.get(source);
  if (cached) return cached;

  const sheet = new CSSStyleSheet();
  sheet.replaceSync(source);
  sheetCache.set(source, sheet);
  sheetSource.set(sheet, source);
  return sheet;
};

/** CSS-текст листа — для серверного рендера, где лист превращается обратно в <style>. */
export const styleSheetText = (sheet: CSSStyleSheet): string =>
  sheetSource.get(sheet) ?? [...sheet.cssRules].map((rule) => rule.cssText).join("\n");

const toList = (styles: ComponentStyles) => (Array.isArray(styles) ? styles : [styles]) as readonly (string | CSSStyleSheet)[];

/**
 * Вешает стили на shadow root; вызывается один раз при создании компонента.
 *
 * Возвращает узлы, которые render должен положить в shadow перед разметкой. На основном
 * пути список пуст: adoptedStyleSheets переживает replaceChildren. На запасном пути это
 * <style>, и его приходится вставлять заново при каждом подключении к DOM — иначе
 * replaceChildren в connectedCallback стёр бы стили вместе со старой разметкой.
 */
export const adoptStyles = (root: ShadowRoot, styles: ComponentStyles | undefined): Node[] => {
  if (!styles) return [];
  const list = toList(styles);
  if (list.length === 0) return [];

  if (supportsConstructableSheets) {
    root.adoptedStyleSheets = [
      ...root.adoptedStyleSheets,
      ...list.map((item) => (typeof item === "string" ? toSheet(item) : item)),
    ];
    return [];
  }

  return list.map((item) => {
    const style = document.createElement("style");
    style.textContent =
      typeof item === "string" ? item : [...item.cssRules].map((rule) => rule.cssText).join("\n");
    return style;
  });
};
