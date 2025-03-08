import { ReactiveSignal } from "@shared/types";
import { ComponentConfig, ComponentInitConfig } from "../../types/element";
import { BaseElement } from "./element";
import { elementHelpers, initComponent } from "./element-helper";

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
    },
  };
  return initComponent(component, config)
};
