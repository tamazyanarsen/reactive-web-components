import { BaseElement, component, createElement, effect, event, newEventEmitter, property, signal } from "@shared/utils";

@component('rx-input')
export class InputElement extends BaseElement {
  @property()
  placeholder = signal('')

  @property()
  disabled = signal(false)

  @property()
  value = signal('')

  @event()
  changeValue = newEventEmitter<string | number>()

  rootStyle?: Promise<typeof import("*?raw")> | undefined = import('./input.scss?raw');

  render() {
    // TODO: refactor with addEffect
    const inputEl = createElement('input')
    effect(() => {
      console.log(`disabled, old value: ${this.disabled.oldValue}, new value: ${this.disabled()}`)
      inputEl.setAttribute('placeholder', this.placeholder())
      inputEl.setAttribute('value', this.value())
      if (this.disabled()) {
        inputEl.setAttribute('disabled', this.disabled())
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
