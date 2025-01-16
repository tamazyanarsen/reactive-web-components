import { ReactiveSignal } from "@shared/types";
import { ComponentConfig } from "../../types/element";
import { BaseElement } from "./element";
import { elementHelpers } from "./element-helper";

export type CustomComponentConfig<T extends HTMLElement> = {
  setReactiveValue<ModelType = unknown>(value: ReactiveSignal<ModelType>): ComponentConfig<T>;
}

export const createCustomElement = <T extends HTMLElement>(
  tagName: string,
): ComponentConfig<T> & CustomComponentConfig<T> => {
  const wrapper = document.createElement(tagName) as T;
  return {
    ...elementHelpers(wrapper),
    setReactiveValue(value) {
      if (wrapper instanceof BaseElement) wrapper.setReactiveValue(value);
      return this;
    },
  };
};
