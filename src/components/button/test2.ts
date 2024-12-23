import { ComponentConfig } from "@shared/types";
import { BaseElement, component, createCustomElement } from "@shared/utils";

@component("rx-test")
export class Test extends BaseElement {
  render(): ComponentConfig {
    return createCustomElement('rx-wrapper').append(
      createCustomElement('rx-button')
        .setContent('test button')
        .setAttribute('slot', 'test-slot')
        .handleSlotContext(e => console.log('MY CONTEXT', e))
    )
  }
}

export const initTest = () => { }
