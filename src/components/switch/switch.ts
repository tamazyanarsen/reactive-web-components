import { ComponentConfig, ReactiveSignal } from "@shared/types";
import {
  BaseElement,
  component,
  createCustomElement,
  createElement,
  event,
  newEventEmitter,
  property,
  signal
} from "@shared/utils";
import { IconComponent } from "main";

@component("rx-switch")
export class SwitchComponent extends BaseElement {
  rootStyle?: Promise<typeof import("*?raw")> | undefined = import(
    "./switch.scss?raw"
  );

  @property()
  isSelected = signal(false);

  @property()
  label = signal("");

  @event()
  changeSelected = newEventEmitter<boolean>();

  render(): ComponentConfig {
    // TODO: удалить!!!
    createElement('div', { attributes: { slot: '12' } })
    createCustomElement<IconComponent>('rx-icon')
    // -------
    return createElement("div")
      .addClass("container")
      .set(
        createElement("div")
          .addClass("switch-container")
          .addReactiveClass({
            selected:
              (this.modelValue as ReactiveSignal<boolean>) ?? this.isSelected,
          })
          .addEventlistener("click", () => {
            this.isSelected.set(!this.isSelected());
            this.changeSelected(this.isSelected());
            if (this.modelValue) this.modelValue.set(!this.modelValue());
          }),
        createElement("div").addClass("label").setReactiveContent(this.label),
      );
  }
}
