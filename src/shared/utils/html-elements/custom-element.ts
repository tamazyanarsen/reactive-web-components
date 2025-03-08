import { ReactiveSignal } from "@shared/types";
import { ComponentConfig } from "../../types/element";
import { BaseElement } from "./element";
import { elementHelpers } from "./element-helper";

export type CustomComponentConfig<T extends HTMLElement> = {
  setReactiveValue<ModelType = unknown>(value: ReactiveSignal<ModelType>): ComponentConfig<T>;
}

export const createCustomElement = <T extends HTMLElement>(
  tagName: string,
  classes?:
    | (string | { [className: string]: ReactiveSignal<boolean> })[]
    | { [className: string]: ReactiveSignal<boolean> }
    | string
    | null,
  attributes?: Record<string, string | number | ReactiveSignal<any>>
): ComponentConfig<T> & CustomComponentConfig<T> => {
  const wrapper = document.createElement(tagName) as T;

  const componentConfig: ComponentConfig<T> & CustomComponentConfig<T> = {
    ...elementHelpers(wrapper),
    setReactiveValue(value) {
      if (wrapper instanceof BaseElement) wrapper.setReactiveValue(value);
      return this;
    },
  }

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
