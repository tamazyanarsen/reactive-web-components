import { ComponentConfig } from "@shared/types";
import { BaseElement, component, createElement, event, newEventEmitter, property, signal } from "@shared/utils";
import { Option } from "../types/select";

@component('rx-select')
export class SelectComponent extends BaseElement {
  rootStyle?: Promise<typeof import("*?raw")> | undefined = import('./base-select.scss?raw');

  @property()
  options = signal<Option[]>([])

  @property()
  isMulti = signal(false)

  @event()
  change = newEventEmitter()

  render(): ComponentConfig {
    return createElement('div')
      .addHtmlContent('select element')
      .append(
        createElement('select')
          .addClass('select-container', 'base-border')
          .addEventlistener('change', () => this.change())
          .addEffect(self => self.append(
            ...this.options()
              .map(option =>
                createElement('option')
                  .setAttribute('value', option.value)
                  .setHtmlContent(option.label)
              )
          ))
          .addEffect(self =>
            this.isMulti()
              ? self.setAttribute('multiple', true)
              : self.removeAttribute('multiple')
          )
      );
  }
}
