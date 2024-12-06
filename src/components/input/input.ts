import { ComponentConfig } from "@shared/types";
import { BaseElement, component, createElement, effect, log, property, signal } from "@shared/utils";

@component('t1-input')
export class InputElement extends BaseElement {
  @property()
  placeholder = signal('')

  rootStyle?: Promise<typeof import("*?raw")> | undefined = import('./input.css?raw');

  render(): ComponentConfig {
    const inp = document.createElement('input')
    log(`int attr: %c${JSON.stringify(inp.attributes)}%c %c${JSON.stringify(inp.getAttributeNames())}%c`)
    const wrapper = createElement('input').addClass('container')
    setTimeout(() => {
      this.placeholder.set('some placeholder')
    }, 2000)
    setTimeout(() => {
      this.placeholder.set('placeholder')
    }, 4000)
    effect(() => {
      (wrapper.hostElement as HTMLInputElement).placeholder = this.placeholder()
    })
    return wrapper
  }
}
