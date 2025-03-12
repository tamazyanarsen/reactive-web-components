import { BaseElement, component, createCustomElement } from "@shared/utils";

@component("rx-test")
export class Test extends BaseElement {
  render() {
    return createCustomElement('rx-wrapper').append(
      createCustomElement('rx-button')
        .setHtmlContent('test button')
        .setAttribute('slot', 'test-slot')
        .handleSlotContext(e => console.log('MY CONTEXT', e))
    )
  }
}

export const initTest = () => { }
