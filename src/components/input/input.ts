import { ComponentConfig } from "@shared/types";
import { BaseElement, component, createElement, property, signal } from "@shared/utils";

@component('rx-input')
export class InputElement extends BaseElement {
  @property()
  placeholder = signal('')

  rootStyle?: Promise<typeof import("*?raw")> | undefined = import('./input.css?raw');

  render(): ComponentConfig {
    const wrapper = createElement('input').addClass('container')
    return wrapper
  }
}
