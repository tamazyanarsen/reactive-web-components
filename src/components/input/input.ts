import { ComponentConfig } from "@shared/types";
import { BaseElement, component, createElement, effect, property, signal } from "@shared/utils";

@component('rx-input')
export class InputElement extends BaseElement {
  @property()
  placeholder = signal('')

  @property()
  disabled = signal(true)

  @property()
  value = signal('')

  rootStyle?: Promise<typeof import("*?raw")> | undefined = import('./input.scss?raw');

  render(): ComponentConfig {
    const inputEl = createElement('input')
    effect(() => {
      const isDisabled = this.disabled()
      console.log(`disabled, old value: ${this.disabled.oldValue}, new value: ${this.disabled()}`)
      inputEl.setAttribute('placeholder', this.placeholder())
      inputEl.setAttribute('value', this.value())
      if (isDisabled) {
        inputEl.setAttribute('disabled', isDisabled)
      }
      else {
        inputEl.hostElement.removeAttribute('disabled')
      }
    })
    return createElement('div')
      .addClass('container')
      .append(
        inputEl.addClass('input-field')
      )
  }
}
