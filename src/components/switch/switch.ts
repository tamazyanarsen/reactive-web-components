import { ComponentConfig } from "@shared/types";
import { BaseElement, component, createElement, event, newEventEmitter, property, signal } from "@shared/utils";

@component('rx-switch')
export class SwitchComponent extends BaseElement {
  rootStyle?: Promise<typeof import("*?raw")> | undefined = import('./switch.scss?raw');

  @property()
  isSelected = signal(false)

  @property()
  label = signal('')

  @event()
  changeSelected = newEventEmitter<boolean>()

  render(): ComponentConfig {
    return createElement('div')
      .addClass('container')
      .set(
        createElement('div').addClass('switch-container')
          .addReactiveClass({ selected: this.isSelected })
          .addEventlistener('click', () => {
            this.isSelected.set(!this.isSelected());
            this.changeSelected(this.isSelected());
          }),
        createElement('div').addClass('label').setReactiveContent(this.label)
      )
  }
}

