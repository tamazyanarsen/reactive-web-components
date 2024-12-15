import { ComponentConfig } from "@shared/types/element";
import { component, property } from "@shared/utils/decorators/html-property";
import { BaseElement, createElement } from "@shared/utils/html-elements/element";
import { signal } from "@shared/utils/html-elements/signal";

@component('rx-button')
export class ButtonComponent extends BaseElement {
  @property()
  type = signal('Primary')

  rootStyle = import('./button.scss?raw');

  render(): ComponentConfig {
    const wrapper = createElement('div').addClass('container')
    const btnEl = createElement('button')
      .addClass('btn-el', this.type())
      .append(createElement('slot'))

    // effect(() => { wrapper.setContent(this.content()) })
    return wrapper.append(btnEl)
  }
}

export const initButton = () => { }
