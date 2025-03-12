import { SlotContext } from "@shared/types";
import { BaseElement, component, createCustomElement, createElement, effect, signal } from "@shared/utils";
import { SwitchComponent } from "main";

@component('rx-wrapper')
export class TestWrapper extends BaseElement {
  slotContext?: SlotContext | undefined = { 'test-slot': 12 };

  switchValue = signal(true)

  render() {
    effect(() => console.log('NEW SWITCH VALUE', this.switchValue()))
    return createElement('div')
      .append(
        createCustomElement<SwitchComponent>('rx-switch')
          .setReactiveValue(this.switchValue),
        createElement('div').setHtmlContent('проверка слота, это wrapper!!!'),
        createElement('slot').setAttribute('name', 'test-slot')
      )
  }
}

export const initWrapper = () => { }
