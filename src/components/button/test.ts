import { ComponentConfig, SlotContext } from "@shared/types";
import { BaseElement, component, createElement } from "@shared/utils";

@component('rx-wrapper')
export class TestWrapper extends BaseElement {
  slotContext?: SlotContext | undefined = { 'test-slot': 12 };

  render(): ComponentConfig {
    return createElement('div')
      .append(
        createElement('div').setHtmlContent('проверка слота, это wrapper!!!'),
        createElement('slot').setAttribute('name', 'test-slot')
      )
  }
}

export const initWrapper = () => { }
