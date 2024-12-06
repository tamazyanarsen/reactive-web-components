import { ComponentConfig } from "@shared/types/element";
import { component, property } from "@shared/utils/decorators/html-property";
import { BaseElement, createElement } from "@shared/utils/html-elements/element";
import { effect, signal } from "@shared/utils/html-elements/signal";

@component('t1-button')
export class ButtonComponent extends BaseElement {
  @property()
  buttonName = signal('init name')

  observedAttributes = ['testsdklfjlsdfjljsdfljklsf']

  rootStyle = import('./button.css?raw');

  render(): ComponentConfig {
    const wrapper = createElement('button')

    wrapper.addClass('test-btn')
    wrapper.addStyle({
      width: '8em',
      height: '4em',
      borderRadius: '2em'
    })
    effect(() => { wrapper.setContent(this.buttonName()) })
    return wrapper
  }
}

export const initButton = () => { }
