import { ReactiveSignal } from "@shared/types";
import { ComponentConfig, ExtraHTMLElement, HtmlTagName, SlotContext } from "../../types/element";
import { elementHelpers } from "./element-helper";

export const createElement = <K extends HtmlTagName>(
  tagName: K,
  classes?:
    | (string | { [className: string]: ReactiveSignal<boolean> })[]
    | { [className: string]: ReactiveSignal<boolean> }
    | string
    | null,
  attributes?: Record<string, string | number | ReactiveSignal<any>>
): ComponentConfig<HTMLElementTagNameMap[K]> => {
  const wrapper = document.createElement<K>(tagName);

  const componentConfig = {
    ...elementHelpers(wrapper),
  };

  if (classes) {
    [classes].flat().forEach((className) => {
      if (className instanceof Object) {
        componentConfig.addReactiveClass(className);
        return;
      }
      componentConfig.addClass(className);
    });
  }

  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number') {
        componentConfig.setAttribute<string, string>(key, String(value));
        return;
      }
      componentConfig.setReactiveAttribute(key, value);
    });
  }

  return componentConfig;
};

export abstract class BaseElement extends HTMLElement {

  slotContext?: SlotContext

  protected rootStyle?: Promise<typeof import("*?raw")>

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
