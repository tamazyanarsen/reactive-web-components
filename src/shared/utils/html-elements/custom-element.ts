import { ReactiveSignal } from "@shared/types";
import { ComponentConfig, ComponentContent, ComponentInitConfig, HtmlTagName } from "../../types/element";
import { BaseElement } from "./element";
import { appendContentItem, elementHelpers, initComponent } from "./element-helper";

export type CustomComponentConfig<T extends HTMLElement> = {
  setReactiveValue<ModelType = unknown>(value: ReactiveSignal<ModelType>): ComponentConfig<T>;
}

export const createCustomElement = <T extends HTMLElement>(
  tagName: string, config?: ComponentInitConfig<T>
): ComponentConfig<T> & CustomComponentConfig<T> => {
  const wrapper = document.createElement(tagName) as T;
  const component: ComponentConfig<T> & CustomComponentConfig<T> = {
    ...elementHelpers(wrapper),
    setReactiveValue(value) {
      if (wrapper instanceof BaseElement) wrapper.setReactiveValue(value);
      return this;
    }
  };
  return initComponent(component, config)
};

export const createCustomEl = <K extends HtmlTagName, T extends HTMLElementTagNameMap[K]>(
  tagName: `${K} ${string}`,
  config?: ComponentInitConfig<T>
) => {
  const classList = tagName.split(' ').slice(1).map(e => e.trim())
  const comp = createCustomElement<T>(tagName.split(' ')[0] as K, config)
  if (Array.isArray(classList) && classList.length > 0) { comp.addClass(...classList) }
  return (
    ...content: ComponentContent[]
  ) => {
    content.filter(Boolean).forEach(item => appendContentItem(comp, item));
    return comp
  }
}