import { EffectCb, ReactiveSignal } from "../utils/signal";

export type Split<S extends string, D extends string> = string extends S
  ? string[]
  : S extends ""
    ? []
    : S extends `${infer T}${D}${infer U}`
      ? [T, ...Split<U, D>]
      : [S];

export type Join<T extends unknown[], D extends string> = T extends []
  ? ""
  : T extends [string | number | boolean | bigint]
    ? `${T[0]}`
    : T extends [string | number | boolean | bigint, ...infer U]
      ? `${T[0]}${D}${Join<U, D>}`
      : string;

export type HtmlTagName = keyof HTMLElementTagNameMap;

export type ExtraHTMLElement = HTMLElement & {
  render?: () => ComponentConfig<ExtraHTMLElement>;
  effectSet?: Set<WeakRef<EffectCb>>;
  onConnected?: (
    self: ComponentConfig<ExtraHTMLElement>,
    host: ExtraHTMLElement,
  ) => void;
  slotTemplate?: SlotTemplate;
};

export type SignalValue<T> = T extends ReactiveSignal<infer V> ? V : T;

export type EventKeys<T> = {
  [k in keyof T]: T[k] extends EventEmitter<any> ? k : never;
}[keyof T];

export type ComponentEventListener<
  T extends ExtraHTMLElement,
  E extends Event,
> = (e: E, self: ComponentConfig<T>, host: T) => void;

export type CustomEventListener<DetailValue, T extends ExtraHTMLElement> = (
  e: CustomEvent<DetailValue>,
  self: ComponentConfig<T>,
  host: T,
) => void;

export type CustomEventValue<T> = T extends EventEmitter<infer V> ? V : T;

export type ComponentCallback<T extends ExtraHTMLElement> = (
  self: ComponentConfig<T>,
  host: T,
) => void;

export type AttrSignal<
  T extends HTMLElement & { render?: () => ComponentConfig<ExtraHTMLElement> },
> = T["render"] extends () => ComponentConfig<ExtraHTMLElement>
  ? { [k in keyof T]: T[k] extends ReactiveSignal<any> ? k : never }[keyof T &
      string]
  : keyof T & string;

export type EffectCallback<T extends HTMLElement> = (
  self: ComponentConfig<T>,
  host: T,
) => void;

export type ComponentContent =
  | ComponentConfig<ExtraHTMLElement>
  | string
  | ReactiveSignal<any>;

export type CompFuncContent = () => ComponentContent | ComponentContent[];

export type ContextCompFuncContent<T extends ExtraHTMLElement> = (
  self: ComponentConfig<T>,
) => ComponentContent | ComponentContent[];

export type ChildrenContent<T extends ExtraHTMLElement> =
  | ComponentContent
  | ContextCompFuncContent<T>
  | (ComponentContent | ContextCompFuncContent<T>)[];

export interface ComponentConfig<T extends ExtraHTMLElement> {
  /**
   * append child components
   */
  append(...args: ComponentConfig<ExtraHTMLElement>[]): ComponentConfig<T>;
  /**
   * clear and append child components
   */
  set(...args: ComponentConfig<ExtraHTMLElement>[]): ComponentConfig<T>;
  /**
   * remove child components
   */
  removeChild(...args: ComponentConfig<ExtraHTMLElement>[]): ComponentConfig<T>;
  /**
   * add html (string) content to host element
   */
  addHtmlContent(content: string): ComponentConfig<T>;
  /**
   * clear and add html (string) content to host element
   */
  setHtmlContent(content: string): ComponentConfig<T>;
  /**
   * add css style to host element
   */
  addStyle(style: ConfigStyle): ComponentConfig<T>;
  /**
   * add event listener to component
   */
  addEventlistener<
    K extends T["render"] extends () => ComponentConfig<ExtraHTMLElement>
      ? never
      : keyof HTMLElementEventMap,
  >(
    eventName: K,
    cb: ComponentEventListener<T, HTMLElementEventMap[K]>,
    options?: boolean | AddEventListenerOptions,
  ): ComponentConfig<T>;
  addEventlistener<K extends EventKeys<T>>(
    eventName: K,
    cb: CustomEventListener<CustomEventValue<T[K]>, T>,
    options?: boolean | AddEventListenerOptions,
  ): ComponentConfig<T>;
  /**
   * set attribute value to component
   */
  // setAttribute<AttrName extends AttrSignal<T> | string, AttrValue extends SignalValue<AttrName extends AttrSignal<T> ? T[AttrName] : unknown>>(attrName: AttrName, value: AttrValue): ComponentConfig<T>;
  setAttribute<
    AttrName extends AttrSignal<T>,
    AttrValue extends SignalValue<T[AttrName]>,
  >(
    attrName: AttrName,
    value: AttrValue,
  ): ComponentConfig<T>;
  setCustomAttribute(attrName: string, value: unknown): ComponentConfig<T>;
  /**
   * bind reactive signal with attribute
   */
  // setReactiveAttribute<AttrName extends AttrSignal<T> | string, AttrValue extends ReactiveSignal<SignalValue<AttrName extends AttrSignal<T> ? T[AttrName] : unknown>>>(attrName: AttrName, value: AttrValue): ComponentConfig<T>;
  setReactiveAttribute<
    AttrName extends AttrSignal<T>,
    AttrValue extends ReactiveSignal<SignalValue<T[AttrName]>>,
  >(
    attrName: AttrName,
    value: AttrValue,
  ): ComponentConfig<T>;
  setReactiveCustomAttribute(
    attrName: string,
    value: ReactiveSignal<unknown>,
  ): ComponentConfig<T>;
  /**
   * remove attribute from component
   */
  removeAttribute<AttrName extends keyof T & string>(
    attrName: AttrName,
  ): ComponentConfig<T>;
  /**
   * callback function for handling components slot context
   */
  // handleSlotContext<SlotValue = unknown>(cb: (value: ReactiveSignal<SlotValue>) => void): ComponentConfig<T>;
  /**
   * callback function for handling components connected event
   */
  onConnected(
    cb: (self: ComponentConfig<T>, host: T) => void,
  ): ComponentConfig<T>;
  /**
   * add css-class to component
   */
  addClass(...className: (string | (() => string))[]): ComponentConfig<T>;
  /**
   * set css-class to component
   */
  setClass(...className: string[]): ComponentConfig<T>;
  /**
   * bind reactive signal with component css-class
   */
  addReactiveClass(classConfig: {
    [className: string]: ReactiveSignal<boolean>;
  }): ComponentConfig<T>;
  /**
   * remove css-class from component
   */
  removeClass(...className: string[]): ComponentConfig<T>;
  /**
   * replace css-class from component
   */
  replaceClass(oldClass: string, newClass: string): ComponentConfig<T>;
  /**
   * add reactive effect for component instance
   */
  addEffect(cb: EffectCallback<T>, key?: string | symbol): ComponentConfig<T>;
  /**
   * bind reactive signal with component innerHtml
   */
  addReactiveContent(content: ReactiveSignal<unknown>): ComponentConfig<T>;
  /**
   * clear content and bind reactive signal with component innerHtml
   */
  setReactiveContent(content: ReactiveSignal<unknown>): ComponentConfig<T>;
  /**
   * clear component content
   */
  clear(): ComponentConfig<T>;
  /**
   * host element
   */
  get hostElement(): T | undefined;
}

export type SlotTemplate = Record<
  string,
  (slotCtx: any) => ComponentConfig<ExtraHTMLElement> | null
>;

export type CustomComponentConfig<T extends ExtraHTMLElement> = {
  setReactiveValue<ModelType = unknown>(
    value: ReactiveSignal<ModelType>,
  ): CustomComponentConfig<T>;
  /**
   * slot template
   */
  setSlotTemplate<K extends keyof T["slotTemplate"] & string>(templateConfig: {
    [slotKey in K]: T["slotTemplate"][slotKey];
  }): CustomComponentConfig<T>;
} & ComponentConfig<T>;

export type CssKey = Exclude<
  keyof CSSStyleDeclaration,
  "length" | "parentRule"
>;

export interface EventEmitterWrapper {
  <EventValue = unknown>(): EventEmitter<EventValue>;
}

export interface EventEmitter<EventValue> {
  (_value: EventValue | ReactiveSignal<EventValue>): void;
  oldValue: null;
}

export type SlotContext = { [slotName: string]: ReactiveSignal<unknown> };

export type AttributeValue<
  T extends ExtraHTMLElement,
  K extends AttrSignal<T>,
> =
  | ReactiveSignal<SignalValue<T[K]>>
  | SignalValue<T[K]>
  | (() => SignalValue<T[K]>);

export type ConfigAttribute<T extends ExtraHTMLElement> = {
  [key in AttrSignal<T>]?: AttributeValue<T, key>;
};
export type ConfigEventListener<T extends ExtraHTMLElement> = {
  [key in keyof HTMLElementEventMap]?: ComponentEventListener<
    T,
    HTMLElementEventMap[key]
  >;
};
export type ConfigCustomEventListener<T extends ExtraHTMLElement> = {
  [key in EventKeys<T>]?: CustomEventListener<CustomEventValue<T[key]>, T>;
};
export type ConfigCustomAttribute = Record<string, unknown>;
export type ConfigCustomListeners<T extends ExtraHTMLElement> = Record<
  string,
  CustomEventListener<unknown, T>
>;
export type ConfigReactiveClassList = Record<string, ReactiveSignal<boolean>>;
export type ConfigChildren = ComponentContent[];
export type ConfigEffect<T extends ExtraHTMLElement> = EffectCallback<T>[];
export type ConfigListeners<T extends ExtraHTMLElement> =
  ConfigEventListener<T> & ConfigCustomEventListener<T>;
export type ConfigClassList = (string | (() => string))[];
export type ConfigStyle = Partial<{
  [key in CssKey]: CSSStyleDeclaration[key] | (() => CSSStyleDeclaration[key]);
}> &
  Partial<{
    [key in `--${string}`]: string | (() => string);
  }>;

export type ComponentInitConfig<T extends ExtraHTMLElement> = Partial<{
  classList: ConfigClassList;
  ref: ReactiveSignal<ComponentConfig<T> | null>;
  style: ConfigStyle;
  attributes: ConfigAttribute<T>;
  customAttributes: ConfigCustomAttribute;
  reactiveClassList: ConfigReactiveClassList;
  children: ConfigChildren;
  effects: ConfigEffect<T>;
  listeners: ConfigListeners<T>;
  customListeners: ConfigCustomListeners<T>;
}> &
  Partial<
    {
      [key in AttrSignal<T> as `.${key}`]?: AttributeValue<T, key>;
    } & {
      [K in keyof HTMLElementEventMap as `@${string &
        K}`]?: ComponentEventListener<T, HTMLElementEventMap[K]>;
    } & {
      [K in EventKeys<T> as `@${string & K}`]?: CustomEventListener<
        CustomEventValue<T[K]>,
        T
      >;
    } & {
      [key in `$${string}`]: EffectCallback<T>;
    }
  >;

export const isComponentInitConfig = (
  item: any,
): item is ComponentInitConfig<any> =>
  item &&
  typeof item === "object" &&
  ("classList" in item ||
    "attributes" in item ||
    "customAttributes" in item ||
    "reactiveClassList" in item ||
    "listeners" in item ||
    "customListeners" in item ||
    "children" in item ||
    "effects" in item ||
    "ref" in item ||
    "style" in item ||
    Object.keys(item).some(
      (key) =>
        key.startsWith(".") || key.startsWith("@") || key.startsWith("$"),
    )) &&
  !("hostElement" in item);

// Тип для события контекста
export interface ContextEvent<T> extends CustomEvent {
  detail: {
    context: string;
    callback: (value: T) => void;
  };
}

export const isComponentConfig = <T extends ExtraHTMLElement>(
  item: any,
): item is ComponentConfig<T> =>
  item &&
  typeof item === "object" &&
  "hostElement" in item &&
  "append" in item &&
  "set" in item &&
  "addStyle" in item &&
  "setAttribute" in item &&
  "addClass" in item &&
  "addEffect" in item &&
  "addReactiveContent" in item &&
  "setReactiveContent" in item &&
  "clear" in item;
