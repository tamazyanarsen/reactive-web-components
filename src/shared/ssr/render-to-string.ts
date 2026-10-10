import { BaseElement } from "../components/custom/custom-element";
import { buildFragment, type FlowContent } from "../components/html";
import { createRoot } from "../components/utils/render-context";
import { styleSheetText } from "../components/utils/styles";

/** Элементы без закрывающего тега. */
const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr",
]);

/** Содержимое этих элементов — не HTML, экранировать его нельзя. */
const RAW_TEXT_ELEMENTS = new Set(["script", "style"]);

const escapeText = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const escapeAttr = (text: string) => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

export type RenderToStringOptions = {
  /**
   * Оставлять комментарии-якоря блоков when/each/dynamic. По умолчанию нет: клиент
   * всё равно рендерит компоненты заново, а якоря только раздувают HTML.
   */
  comments?: boolean;
};

/** Теневой корень элемента, включая закрытый: у компонента rwc он лежит в поле shadow. */
const shadowOf = (element: Element): ShadowRoot | null => {
  if (element.shadowRoot) return element.shadowRoot;
  if (element instanceof BaseElement) return (element as unknown as { shadow: ShadowRoot }).shadow;
  return null;
};

/**
 * Атрибуты элемента плюс состояние, которое живёт в свойствах: значение и отметка полей
 * ввода. Без этого поле, заполненное через `.value`, пришло бы в HTML пустым.
 */
const attributesOf = (element: Element): [string, string][] => {
  const attributes = new Map<string, string>();
  for (const attr of element.attributes) attributes.set(attr.name, attr.value);

  if (element instanceof HTMLInputElement) {
    if (element.type === "checkbox" || element.type === "radio") {
      if (element.checked) attributes.set("checked", "");
      else attributes.delete("checked");
    } else if (element.value !== "") {
      attributes.set("value", element.value);
    }
  }
  if (element instanceof HTMLOptionElement && element.selected) attributes.set("selected", "");

  return [...attributes];
};

const serializeChildren = (parent: ParentNode, options: RenderToStringOptions): string => {
  let html = "";
  for (const child of parent.childNodes) html += serializeNode(child, options);
  return html;
};

/** Declarative Shadow DOM: <template shadowrootmode> со стилями и разметкой корня. */
const serializeShadow = (root: ShadowRoot, options: RenderToStringOptions): string => {
  let attrs = ` shadowrootmode="${root.mode}"`;
  if (root.delegatesFocus) attrs += " shadowrootdelegatesfocus";

  let styles = "";
  for (const sheet of root.adoptedStyleSheets ?? []) {
    styles += `<style>${styleSheetText(sheet)}</style>`;
  }

  return `<template${attrs}>${styles}${serializeChildren(root, options)}</template>`;
};

const serializeNode = (node: Node, options: RenderToStringOptions): string => {
  switch (node.nodeType) {
    case Node.TEXT_NODE: {
      const parent = node.parentNode;
      const raw = parent instanceof Element && RAW_TEXT_ELEMENTS.has(parent.localName);
      return raw ? (node.textContent ?? "") : escapeText(node.textContent ?? "");
    }

    case Node.COMMENT_NODE:
      return options.comments ? `<!--${node.textContent ?? ""}-->` : "";

    case Node.DOCUMENT_FRAGMENT_NODE:
      return serializeChildren(node as DocumentFragment, options);

    case Node.ELEMENT_NODE: {
      const element = node as Element;
      const tag = element.localName;

      let html = `<${tag}`;
      for (const [name, value] of attributesOf(element)) {
        html += value === "" ? ` ${name}` : ` ${name}="${escapeAttr(value)}"`;
      }
      html += ">";
      if (VOID_ELEMENTS.has(tag)) return html;

      const shadow = shadowOf(element);
      if (shadow) html += serializeShadow(shadow, options);

      // У <template> разметка лежит в content, а не среди детей.
      const content = element instanceof HTMLTemplateElement ? element.content : element;
      if (element instanceof HTMLTextAreaElement) html += escapeText(element.value);
      else html += serializeChildren(content, options);

      return `${html}</${tag}>`;
    }

    default:
      return "";
  }
};

/**
 * Серверный рендер в HTML с Declarative Shadow DOM:
 *
 *   import { GlobalRegistrator } from "@happy-dom/global-registrator";
 *   GlobalRegistrator.register();               // DOM для сервера — один раз на процесс
 *   const { renderToString } = await import("@rwcjs/core");
 *   const { counter } = await import("./ui/counter");
 *
 *   const html = renderToString(() => counter({ ".value": 5 }));
 *
 * Компоненты рендерятся на настоящем (серверном) DOM, а их теневые корни уходят в HTML
 * как `<template shadowrootmode="open">` вместе со стилями. Браузер показывает такую
 * разметку сразу, до загрузки JS. Когда компонент зарегистрируется на клиенте,
 * attachShadow вернёт уже готовый декларативный корень, и компонент отрисует себя заново
 * поверх него — состояние приходит из атрибутов, поэтому значения пропсов, нужные
 * клиенту, отражайте в атрибуты (`reflect`).
 *
 * Эффекты рендера живут ровно столько, сколько нужно для сериализации, и уничтожаются
 * перед возвратом.
 */
export const renderToString = (
  build: () => FlowContent,
  options: RenderToStringOptions = {},
): string => {
  // Компоненты рендерятся в connectedCallback — без вставки в документ разметки не будет.
  const container = document.createElement("div");
  document.body.append(container);

  try {
    return createRoot((dispose) => {
      try {
        container.append(buildFragment(build()));
        return serializeChildren(container, options);
      } finally {
        dispose();
      }
    });
  } finally {
    container.remove();
  }
};
