import { component, event, newEventEmitter, property } from "@shared/utils/decorators/html-property";
import { BaseElement, createElement } from "@shared/utils/html-elements/element";
import { signal } from "@shared/utils/html-elements/signal";

type ButtonType = "primary" | "secondary" | "info" | "warning";

@component('rx-button')
export class ButtonComponent extends BaseElement {
  @property()
  type = signal<ButtonType>('primary')

  classListNames: ButtonType[] = ['primary', 'warning', 'info', 'secondary']

  @event()
  change = newEventEmitter()

  @event()
  ttt = newEventEmitter()

  @property()
  label = signal('')

  rootStyle = import('./button.scss?raw');

  render() {
    return createElement('div').addClass('container')
      .append(
        createElement('button')
          .addClass('btn-el')
          .addEventlistener('click', () => this.change())
          .append(
            createElement('slot').setReactiveContent(this.label)
          )
          .addEffect(self => {
            self.removeClass(...this.classListNames)
            self.addClass(this.type())
          })
      )
  }
}
