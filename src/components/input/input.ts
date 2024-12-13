import { ComponentConfig } from "@shared/types";
import { BaseElement, component, createElement, property, signal } from "@shared/utils";

@component('rx-input')
export class InputElement extends BaseElement {
  @property()
  placeholder = signal('')

  rootStyle?: Promise<typeof import("*?raw")> | undefined = import('./input.scss?raw');

  render(): ComponentConfig {
    return createElement('div')
      .addClass('container')
      .append(
        createElement('input')
          .addClass('input-field')
      )
  }
}
