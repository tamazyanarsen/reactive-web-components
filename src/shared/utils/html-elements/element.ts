import { ReactiveSignal } from "@shared/types";
import { ComponentConfig, ComponentInitConfig, ExtraHTMLElement, HtmlTagName, SlotContext } from "../../types/element";
import { elementHelpers, initComponent } from "./element-helper";

export const createElement = <K extends HtmlTagName>(tagName: K, config?: ComponentInitConfig<HTMLElementTagNameMap[K]>): ComponentConfig<HTMLElementTagNameMap[K]> => {
  const wrapper = document.createElement<K>(tagName)
  const component = {
    ...elementHelpers(wrapper)
  }
  return initComponent(component, config)
}

export abstract class BaseElement extends HTMLElement {

  slotContext?: SlotContext

  protected rootStyle?: Promise<typeof import("*?inline")>

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
