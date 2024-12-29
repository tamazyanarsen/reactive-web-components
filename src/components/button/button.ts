import { ComponentConfig } from "@shared/types/element";
import { component, event, newEventEmitter, property } from "@shared/utils/decorators/html-property";
import { BaseElement, createElement } from "@shared/utils/html-elements/element";
import { signal } from "@shared/utils/html-elements/signal";

@component('rx-button')
export class ButtonComponent extends BaseElement {
  @property()
  type = signal('primary')

  @event()
  change = newEventEmitter()

  @event()
  testEvent = newEventEmitter<string>()

  testEvent2 = 12

  rootStyle = import('./button.scss?raw');

  render(): ComponentConfig {
    return createElement('div').addClass('container')
      .append(
        createElement('button')
          .addClass('btn-el')
          .addEventlistener('click', (_ev) => this.change())
          .append(
            createElement('slot')
          )
          .addEffect(self => {
            self.removeClass('primary', 'warning', 'info')
            self.addClass(this.type())
          })
      )
  }
}
