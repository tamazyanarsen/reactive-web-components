
export type HtmlTagName = keyof HTMLElementTagNameMap

export type ExtraHTMLElement = HTMLElement & { handleSlotContext?: <SlotValue = unknown>(value: SlotValue) => void }

export interface ComponentConfig<T extends ExtraHTMLElement = ExtraHTMLElement> {
    append(...args: ComponentConfig[]): ComponentConfig
    addContent(content: string, wrapperElement?: HtmlTagName): ComponentConfig;
    setContent(content: string): ComponentConfig;
    addStyle(style: Partial<CSSStyleDeclaration>): ComponentConfig;
    addEventlistener(eventName: string, cb: EventListener): ComponentConfig;
    setAttribute<AttrName extends keyof T & string, AttrValue = unknown>(attrName: AttrName, value: AttrValue): ComponentConfig;
    handleSlotContext<SlotValue = unknown>(cb: (value: SlotValue) => void): ComponentConfig;
    addClass(className: string): ComponentConfig;
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