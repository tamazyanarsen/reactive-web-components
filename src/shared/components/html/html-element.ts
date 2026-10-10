import type { MaybeReactive } from "../../signals";
import {
  applyAttrs,
  applyShow,
  applyStyle,
  type AttrMap,
  type AttrOption,
  type StyleMap,
} from "../utils/attr-binding";
import { applyClass, type ClassOption, type ClassValue } from "../utils/class-binding";
import { hostEffect } from "../utils/render-context";

// --- служебные утилиты -------------------------------------------------------

type IfEquals<X, Y, A, B> =
  (<G>() => G extends X ? 1 : 2) extends <G>() => G extends Y ? 1 : 2 ? A : B;

/** Ключи, в которые реально можно писать (без readonly вроде tagName / classList). */
type WritableKeys<T> = {
  [Key in keyof T]-?: IfEquals<
    { [Q in Key]: T[Key] },
    { -readonly [Q in Key]: T[Key] },
    Key,
    never
  >;
}[keyof T];

/** Значения B перекрывают A, но набор ключей остаётся от A. */
type Merge<A, B> = { [Key in keyof A]: Key extends keyof B ? B[Key] : A[Key] };

// --- атрибуты (свойства) -----------------------------------------------------

type ElementAttrs<HtmlElementType extends HTMLElement> = {
  [Key in WritableKeys<HtmlElementType> as Key extends string
    ? Extract<HtmlElementType[Key], Function> extends never
      ? `.${Key}`
      : never
    : never]?: MaybeReactive<HtmlElementType[Key]>;
};

// --- события -----------------------------------------------------------------

/** Базовая карта событий конкретного элемента. */
type BaseEventMap<HtmlElementType extends HTMLElement> = HtmlElementType extends HTMLVideoElement
  ? HTMLVideoElementEventMap
  : HtmlElementType extends HTMLMediaElement
    ? HTMLMediaElementEventMap
    : HtmlElementType extends HTMLBodyElement
      ? HTMLBodyElementEventMap
      : HTMLElementEventMap;

/** lib.dom объявляет "input" как Event — для полей ввода это InputEvent. */
type EventOverrides<HtmlElementType extends HTMLElement> = HtmlElementType extends
  | HTMLInputElement
  | HTMLTextAreaElement
  ? { input: InputEvent; beforeinput: InputEvent }
  : {};

type EventMapOf<HtmlElementType extends HTMLElement> = Merge<
  BaseEventMap<HtmlElementType>,
  EventOverrides<HtmlElementType>
>;

type ElementListeners<HtmlElementType extends HTMLElement> = {
  [Key in keyof EventMapOf<HtmlElementType> & string as `@${Key}`]?: (
    ev: EventMapOf<HtmlElementType>[Key] & { currentTarget: HtmlElementType },
  ) => void;
};

export type ElementOptions<HtmlElementType extends HTMLElement> = ElementAttrs<HtmlElementType> &
  ElementListeners<HtmlElementType> &
  ClassOption &
  AttrOption;

export type TagName = keyof HTMLElementTagNameMap;

// --- дети ---------------------------------------------------------------------

/**
 * Ребёнок элемента. Функция — реактивный текст: ребёнком функция быть не может,
 * поэтому бренд сигнала не нужен и `span(() => count())` равнозначен `span(count)`.
 * null/undefined/false пропускаются целиком — чтобы работало `cond && span("x")`.
 */
export type ElementChild = string | number | boolean | null | undefined | Node | (() => unknown);

const toText = (value: unknown) => (value == null ? "" : String(value));

/**
 * Реактивный ребёнок становится постоянным Text-узлом: он держит своё место среди
 * статических соседей, а обновляет его эффект ближайшего веб-компонента —
 * значит эффект умрёт вместе с этим компонентом.
 */
const createReactiveText = (source: () => unknown) => {
  const textNode = document.createTextNode("");
  hostEffect(() => {
    const value = source();
    if (value instanceof Node) {
      console.warn("[rwc] a function child returned a node; use dynamic() for reactive markup", source);
    }
    textNode.textContent = toText(value);
  });
  return textNode;
};

export const appendChildren = (element: ParentNode, children: ElementChild[]) => {
  for (const child of children) {
    // Пустые ветки условий не должны оставлять следов в разметке.
    if (child === null || child === undefined || typeof child === "boolean") continue;

    if (typeof child === "function") {
      element.append(createReactiveText(child));
      continue;
    }
    // Число приводим сами: append принимает только Node и строку.
    element.append(typeof child === "number" ? String(child) : child);
  }
};

/**
 * Конфиг необязателен, поэтому первым аргументом может прийти сразу ребёнок:
 * div("текст") и div({ ".title": "x" }, "текст") одинаково валидны.
 * Конфиг — это всегда объектный литерал; строки, узлы и сигналы им быть не могут.
 */
export const splitConfigAndChildren = <Config>(
  configOrChild: Config | ElementChild | undefined,
  rest: ElementChild[],
): [Config | undefined, ElementChild[]] => {
  const isConfig =
    typeof configOrChild === "object" &&
    configOrChild !== null &&
    Object.getPrototypeOf(configOrChild) === Object.prototype;

  if (isConfig) return [configOrChild as Config, rest];
  if (configOrChild === undefined) return [undefined, rest];
  return [undefined, [configOrChild as ElementChild, ...rest]];
};

// --- реализация --------------------------------------------------------------

const initElement = (element: HTMLElement, options: object) => {
  // class применяем после цикла: статический ".className" пишет атрибут целиком
  // и стёр бы уже поставленные токены.
  let classValue: ClassValue | undefined;
  // show — тоже после: он запоминает инлайновый display, а его выставляет style.
  let showValue: MaybeReactive<boolean> | undefined;

  for (const [key, value] of Object.entries(options)) {
    if (value === undefined) continue;

    if (key === "class") {
      classValue = value as ClassValue;
      continue;
    }

    if (key === "show") {
      showValue = value as MaybeReactive<boolean>;
      continue;
    }

    if (key === "attrs") {
      applyAttrs(element, value as AttrMap);
      continue;
    }

    if (key === "style") {
      applyStyle(element, value as StyleMap);
      continue;
    }

    if (key.startsWith("@")) {
      element.addEventListener(key.slice(1), value as EventListener);
      continue;
    }

    if (key.startsWith(".")) {
      const propName = key.slice(1);
      // Свойства-функции отсеяны на уровне типа (ElementAttrs), так что функция здесь —
      // это всегда реактивный источник, а не обработчик вроде onclick.
      if (typeof value === "function") {
        hostEffect(() => Reflect.set(element, propName, value()));
        continue;
      }
      Reflect.set(element, propName, value);
    }
  }

  if (showValue !== undefined) applyShow(element, showValue);

  if (classValue === undefined) return;

  if (".className" in options) {
    console.warn(
      '[rwc] "class" together with ".className": .className overwrites the whole attribute and erases class tokens',
      element,
    );
  }
  applyClass(element, classValue);
};

/** Низкоуровневая фабрика с произвольным тегом; именованные фабрики см. в html-fabric. */
export const el = <T extends TagName>(
  tagName: T,
  configOrChild?: ElementOptions<HTMLElementTagNameMap[T]> | ElementChild,
  ...rest: ElementChild[]
) => {
  const htmlElement = document.createElement(tagName);
  const [options, children] = splitConfigAndChildren(configOrChild, rest);
  if (options) initElement(htmlElement, options);
  appendChildren(htmlElement, children);
  return htmlElement;
};
