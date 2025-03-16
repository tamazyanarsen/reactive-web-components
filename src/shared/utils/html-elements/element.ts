import { ReactiveSignal } from "@shared/types";
import { ComponentConfig, ComponentContent, ComponentInitConfig, ExtraHTMLElement, HtmlTagName, SignalValue, SlotContext } from "../../types/element";
import { appendContentItem, elementHelpers, initComponent } from "./element-helper";

export const createElement = <K extends HtmlTagName>(
  tagName: K,
  config?: ComponentInitConfig<HTMLElementTagNameMap[K]>
): ComponentConfig<HTMLElementTagNameMap[K]> => {
  const wrapper = document.createElement<K>(tagName)
  const component = {
    ...elementHelpers(wrapper),
  }
  return initComponent(component, config)
}

export const createEl:
  <K extends HtmlTagName>(
    tagName: `${K} ${string}` | K,
    config?: ComponentInitConfig<HTMLElementTagNameMap[K]>
  ) => (...content: ComponentContent[]) => ComponentConfig<HTMLElementTagNameMap[K]> = <K extends HtmlTagName>(
    tagName: `${K} ${string}` | K,
    config?: ComponentInitConfig<HTMLElementTagNameMap[K]>
  ): (...content: ComponentContent[]) => ComponentConfig<HTMLElementTagNameMap[K]> => {
    const classList = tagName.split(' ').slice(1).map(e => e.trim())
    const comp = createElement<K>(tagName.split(' ')[0] as K, config)
    if (Array.isArray(classList) && classList.length > 0) { comp.addClass(...classList) }
    return (
      ...content: ComponentContent[]
    ): ComponentConfig<HTMLElementTagNameMap[K]> => {
      content.filter(Boolean).forEach(item => appendContentItem(comp, item));
      return comp
    }
  }

export const getSignalContent = <R extends ReactiveSignal<any>>(src: R,
  cb: (item: SignalValue<R>) => ComponentContent | ComponentContent[]): ComponentContent => createElement('div')
    .addEffect(self => {
      const signalContent = cb(src())
      const newContent: ComponentContent[] = []
      if (Array.isArray(signalContent)) { newContent.push(...signalContent) }
      else { newContent.push(signalContent) }
      self.clear()
      appendContentItem(self, ...newContent)
    })

export abstract class BaseElement extends HTMLElement {
  static observedAttributes: string[] = [];

  slotContext?: SlotContext

  protected rootStyle?: Promise<typeof import("*?inline")> | Array<Promise<typeof import("*?inline")>>

  protected modelValue?: ReactiveSignal<unknown>

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  abstract render(): ComponentConfig<any>

  setReactiveValue<ModelType = unknown>(value: ReactiveSignal<ModelType>) {
    this.modelValue = value
  }
}

export interface BaseElementConstructor {
  new(...params: any[]): BaseElement;
}

export type HtmlElementConstructor = new (...params: any[]) => HTMLElement

export const isSlotTemplate = (item: Element): item is ExtraHTMLElement => 'handleSlotContext' in item;

export const isBaseElement = (item: any): item is BaseElement => 'render' in item && 'setReactiveValue' in item

