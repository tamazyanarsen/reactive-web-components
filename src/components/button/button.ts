import { ComponentConfig } from "@shared/types/element";
import { component, event, newEventEmitter, property } from "@shared/utils/decorators/html-property";
import { BaseElement, createElement } from "@shared/utils/html-elements/element";
import { signal } from "@shared/utils/html-elements/signal";

@component('rx-button')
export class ButtonComponent extends BaseElement {
  @property()
  type = signal('Primary')

  @event()
  change = newEventEmitter()

  rootStyle = import('./button.scss?raw');

  render(): ComponentConfig {
    const wrapper = createElement('div').addClass('container')
    const btnEl = createElement('button')
      .addClass('btn-el')
      .addEventlistener('click', (_ev) => this.change())
      .append(createElement('slot'))
      .addEffect((self) => { self.setAttribute('btn-type', this.type()) })
    // effect(() => {
    //   btnEl.setAttribute('btn-type', this.type())
    // })
    return wrapper.append(btnEl)
  }
}

export const initButton = () => { }

