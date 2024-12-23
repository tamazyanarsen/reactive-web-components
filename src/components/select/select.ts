import { ComponentConfig } from "@shared/types";
import { BaseElement, component, createElement } from "@shared/utils";

@component('rx-select')
export class SelectComponent extends BaseElement {
  render(): ComponentConfig {
    const wrapper = createElement('div')
    wrapper.append(
      createElement('select')
    )
    return wrapper
  }
  rootStyle?: Promise<typeof import("*?raw")> | undefined = import('./select.scss?raw');
}
