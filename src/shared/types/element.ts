import { BaseElement } from "@shared/utils";
import { ReactiveSignal } from "./signal";

export type HtmlTagName = keyof HTMLElementTagNameMap

export type ExtraHTMLElement = HTMLElement & { handleSlotContext?: <SlotValue = unknown>(value: SlotValue) => void }

export type SignalValue<T> = T extends ReactiveSignal<infer V> ? V : T

export type EventKeys<T> = {
  [k in keyof T]: T[k] extends EventEmitter<any> ? k : never
}[keyof T];

export type ComponentEventListener<T extends ExtraHTMLElement> = (e: Event, self: ComponentConfig<T>, host: T) => void

export type CustomEventListener<DetailValue, T extends ExtraHTMLElement> = (e: CustomEvent<DetailValue>, self: ComponentConfig<T>, host: T) => void

export type CustomEventValue<T> = T extends EventEmitter<infer V> ? V : T;

export type ComponentCallback<T extends ExtraHTMLElement> = (self: ComponentConfig<T>, host: T) => void

export type AttrSignal<T> = T extends BaseElement ? { [k in keyof T]: T[k] extends ReactiveSignal<any> ? k : never }[keyof T] : keyof T & string

export interface ComponentConfig<T extends ExtraHTMLElement = ExtraHTMLElement> {
  append(...args: ComponentConfig[]): ComponentConfig<T>;
  set(...args: ComponentConfig[]): ComponentConfig<T>;
  removeChild(...args: ComponentConfig[]): ComponentConfig<T>;
  addHtmlContent(content: string, wrapperElement?: HtmlTagName): ComponentConfig<T>;
  setHtmlContent(content: string): ComponentConfig<T>;
  addStyle(style: Partial<CSSStyleDeclaration>): ComponentConfig<T>;
  addEventlistener<K extends keyof HTMLElementEventMap>(eventName: K, cb: ComponentEventListener<T>): ComponentConfig<T>;
  addEventlistener<K extends EventKeys<T>>(eventName: K, cb: CustomEventListener<CustomEventValue<T[K]>, T>): ComponentConfig<T>;
  setAttribute<AttrName extends AttrSignal<T>, AttrValue extends SignalValue<T[AttrName]>>(attrName: AttrName, value: AttrValue): ComponentConfig<T>;
  setReactiveAttribute<AttrName extends AttrSignal<T>, AttrValue extends ReactiveSignal<SignalValue<T[AttrName]>>>(attrName: AttrName, value: AttrValue): ComponentConfig<T>;
  removeAttribute<AttrName extends keyof T & string>(attrName: AttrName): ComponentConfig<T>;
  handleSlotContext<SlotValue = unknown>(cb: (value: SlotValue) => void): ComponentConfig<T>;
  addClass(...className: string[]): ComponentConfig<T>;
  addReactiveClass(classConfig: { [className: string]: ReactiveSignal<boolean> }): ComponentConfig<T>;
  removeClass(...className: string[]): ComponentConfig<T>;
  replaceClass(oldClass: string, newClass: string): ComponentConfig<T>;
  addEffect(cb: (self: ComponentConfig<T>, host: T) => void): ComponentConfig<T>;
  addReactiveContent(content: ReactiveSignal<unknown>): ComponentConfig<T>;
  setReactiveContent(content: ReactiveSignal<unknown>): ComponentConfig<T>;
  clear(): ComponentConfig<T>;
  hostElement: T;
}

export type CssKey = Exclude<keyof CSSStyleDeclaration, 'length' | 'parentRule'>

export interface EventEmitterWrapper {
  <EventValue = unknown>(): EventEmitter<EventValue>
}

export interface EventEmitter<EventValue = unknown> {
  (_value: EventValue): void
}

export type SlotContext = { [slotName: string]: unknown }
