import { ReactiveSignal } from "./signal";

export type Split<S extends string, D extends string> =
  string extends S ? string[] :
  S extends '' ? [] :
  S extends `${infer T}${D}${infer U}` ? [T, ...Split<U, D>] :
  [S];

export type Join<T extends unknown[], D extends string> =
  T extends [] ? '' :
  T extends [string | number | boolean | bigint] ? `${T[0]}` :
  T extends [string | number | boolean | bigint, ...infer U] ? `${T[0]}${D}${Join<U, D>}` :
  string;

export type HtmlTagName = keyof HTMLElementTagNameMap

export type ExtraHTMLElement = HTMLElement & { handleSlotContext?: <SlotValue = unknown>(value: SlotValue) => void, render?: () => ComponentConfig<any> }

export type SignalValue<T> = T extends ReactiveSignal<infer V> ? V : T

export type EventKeys<T> = {
  [k in keyof T]: T[k] extends EventEmitter<any> ? k : never
}[keyof T];

export type ComponentEventListener<T extends ExtraHTMLElement, E extends Event> = (e: E, self: ComponentConfig<T>, host: T) => void

export type CustomEventListener<DetailValue, T extends ExtraHTMLElement> = (e: CustomEvent<DetailValue>, self: ComponentConfig<T>, host: T) => void

export type CustomEventValue<T> = T extends EventEmitter<infer V> ? V : T;

export type ComponentCallback<T extends ExtraHTMLElement> = (self: ComponentConfig<T>, host: T) => void

export type AttrSignal<T extends HTMLElement & { render?: () => ComponentConfig<any> }> = T['render'] extends () => ComponentConfig<any> ? { [k in keyof T]: T[k] extends ReactiveSignal<any> ? k : never }[keyof T & string] : keyof T & string

export type EffectCallback<T extends HTMLElement> = (self: ComponentConfig<T>, host: T) => void

export type ComponentContent = ComponentConfig<any> | string | ReactiveSignal<any>

export interface ComponentConfig<T extends ExtraHTMLElement> {
  /**
   * append child components
   */
  append(...args: ComponentConfig<any>[]): ComponentConfig<T>;
  /**
   * clear and append child components
   */
  set(...args: ComponentConfig<any>[]): ComponentConfig<T>;
  /**
   * remove child components
   */
  removeChild(...args: ComponentConfig<any>[]): ComponentConfig<T>;
  /**
   * add html (string) content to host element
   */
  addHtmlContent(content: string, wrapperElement?: HtmlTagName): ComponentConfig<T>;
  /**
   * clear and add html (string) content to host element
   */
  setHtmlContent(content: string): ComponentConfig<T>;
  /**
   * add css style to host element
   */
  addStyle(style: Partial<CSSStyleDeclaration>): ComponentConfig<T>;
  /**
   * add event listener to component
   */
  addEventlistener<K extends T['render'] extends () => ComponentConfig<any> ? never : keyof HTMLElementEventMap>(eventName: K, cb: ComponentEventListener<T, HTMLElementEventMap[K]>): ComponentConfig<T>;
  addEventlistener<K extends EventKeys<T>>(eventName: K, cb: CustomEventListener<CustomEventValue<T[K]>, T>): ComponentConfig<T>;
  /**
   * set attribute value to component
   */
  // setAttribute<AttrName extends AttrSignal<T> | string, AttrValue extends SignalValue<AttrName extends AttrSignal<T> ? T[AttrName] : unknown>>(attrName: AttrName, value: AttrValue): ComponentConfig<T>;
  setAttribute<AttrName extends AttrSignal<T>, AttrValue extends SignalValue<T[AttrName]>>(attrName: AttrName, value: AttrValue): ComponentConfig<T>;
  setCustomAttribute(attrName: string, value: unknown): ComponentConfig<T>;
  /**
   * bind reactive signal with attribute
   */
  // setReactiveAttribute<AttrName extends AttrSignal<T> | string, AttrValue extends ReactiveSignal<SignalValue<AttrName extends AttrSignal<T> ? T[AttrName] : unknown>>>(attrName: AttrName, value: AttrValue): ComponentConfig<T>;
  setReactiveAttribute<AttrName extends AttrSignal<T>, AttrValue extends ReactiveSignal<SignalValue<T[AttrName]>>>(attrName: AttrName, value: AttrValue): ComponentConfig<T>;
  setReactiveCustomAttribute(attrName: string, value: ReactiveSignal<unknown>): ComponentConfig<T>;
  /**
   * bind reactive signal with attribute
   */
  /**
   * remove attribute from component
   */
  removeAttribute<AttrName extends keyof T & string>(attrName: AttrName): ComponentConfig<T>;
  /**
   * callback function for handling components slot context
   */
  handleSlotContext<SlotValue = unknown>(cb: (value: SlotValue) => void): ComponentConfig<T>;
  /**
  * add css-class to component
  */
  addClass(...className: string[]): ComponentConfig<T>;
  /**
  * bind reactive signal with component css-class
  */
  addReactiveClass(classConfig: { [className: string]: ReactiveSignal<boolean> }): ComponentConfig<T>;
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
  addEffect(cb: EffectCallback<T>): ComponentConfig<T>;
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

  hostElement: T;
}

export type CustomComponentConfig<T extends ExtraHTMLElement> = {
  setReactiveValue<ModelType = unknown>(value: ReactiveSignal<ModelType>): ComponentConfig<T>;
} & ComponentConfig<T>

export type CssKey = Exclude<keyof CSSStyleDeclaration, 'length' | 'parentRule'>

export interface EventEmitterWrapper {
  <EventValue = unknown>(): EventEmitter<EventValue>
}

export interface EventEmitter<EventValue> {
  (_value: EventValue): void,
  oldValue: null
}

export type SlotContext = { [slotName: string]: unknown }

export type ComponentInitConfig<T extends ExtraHTMLElement> =
  Partial<{
    classList: string[],
    attributes: { [key in AttrSignal<T>]?: ReactiveSignal<SignalValue<T[key]>> | SignalValue<T[key]> },
    customAttributes: Record<string, unknown>,
    reactiveClassList: { [k: string]: ReactiveSignal<boolean> }
  }>

export const isComponentInitconfig = (item: any): item is ComponentInitConfig<any> =>
  item && typeof item === 'object' && 'classList' in item && 'attributes' in item && 'customAttributes' in item && 'reactiveClassList' in item