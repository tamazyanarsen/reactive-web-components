import { ComponentConfig } from "@shared/types";
import { BaseElement, component, createElement, effect, property, signal } from "@shared/utils";

@component('rx-input')
export class InputElement extends BaseElement {
  @property()
  placeholder = signal('')

  @property()
  test = signal('')

  constructor() {
    super()
    console.log('signal created', this.placeholder)
  }

  rootStyle?: Promise<typeof import("*?raw")> | undefined = import('./input.scss?raw');

  render(): ComponentConfig {
    const inputEl = createElement('input')
    effect(() => {
      inputEl.setAttribute('placeholder', this.placeholder())
      inputEl.setAttribute('value', this.test())
    })
    return createElement('div')
      .addClass('container')
      .append(
        inputEl.addClass('input-field')
      )
  }
}
