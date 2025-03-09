import { ReactiveSignal } from "@shared/types";
import { ComponentConfig, ComponentInitConfig, ExtraHTMLElement, HtmlTagName, SlotContext } from "../../types/element";
import { elementHelpers, initComponent } from "./element-helper";
import { isReactiveSignal } from "./signal";

export const createElement = <K extends HtmlTagName>(tagName: K, config?: ComponentInitConfig<HTMLElementTagNameMap[K]>): ComponentConfig<HTMLElementTagNameMap[K]> => {
  const wrapper = document.createElement<K>(tagName)
  const component = {
    ...elementHelpers(wrapper)
  }
  return initComponent(component, config)
}

// TODO: попробовать через разделитель пробел < >
export const createEl = <K extends HtmlTagName, S extends `${K}.${string}` | K>(tagName: S, config?: ComponentInitConfig<HTMLElementTagNameMap[K]>) => {
  const classList = tagName.split('.').slice(1).map(e => e.trim())
  const comp = createElement(tagName.split('.')[0] as HtmlTagName, config)
  comp.addClass(...classList)
  let result = (...content: (ComponentConfig | string | ReactiveSignal<unknown>)[]) => {
    content.forEach(item => {
      if (typeof item === 'string') comp.addHtmlContent(item)
      else if (isReactiveSignal(item)) comp.addReactiveContent(item)
      else comp.append(item)
    });
    return comp
  }
  return result
}

export abstract class BaseElement extends HTMLElement {

  slotContext?: SlotContext

  protected rootStyle?: Promise<typeof import("*?inline")> | Array<Promise<typeof import("*?inline")>>

  protected modelValue?: ReactiveSignal<unknown>

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  abstract render(): ComponentConfig

  setReactiveValue<ModelType = unknown>(value: ReactiveSignal<ModelType>) {
    this.modelValue = value
  }
}

export interface BaseElementConstructor {
  new(...params: any[]): BaseElement;
}

export const isSlotTemplate = (item: Element): item is ExtraHTMLElement => 'handleSlotContext' in item
