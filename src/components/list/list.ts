import { ComponentConfig } from "@shared/types";
import { BaseElement, component, createElement, property, signal } from "@shared/utils";

@component('rx-list')
export class ListComponent extends BaseElement {
  rootStyle?: Promise<typeof import("*?raw")> | undefined = import('./list.scss?raw')

  @property()
  items = signal<string[]>([])

  render(): ComponentConfig {
    return createElement('div')
      .addClass('list-container')
      .addEffect(self => {
        self.set(
          ...this.items().map(item =>
            createElement('div')
              .setHtmlContent(item)
              .addClass('list-item')
          )
        )
      })
  }
}
