import { ComponentConfig, ListItem, SelectedItem } from "@shared/types";
import { BaseElement, component, createCustomElement, createElement, property, signal } from "@shared/utils";
import { DropdownComponent } from "components/dropdown/dropdown";

@component('fluent-select')
export class SelectFluentComponent extends BaseElement {
  @property()
  items = signal<ListItem[]>([])

  selectedItems = signal<SelectedItem>({})

  isDropdownVisible = signal(false)

  rootStyle?: Promise<typeof import("*?raw")> | undefined = import('./select.scss?raw')

  render(): ComponentConfig {
    document.body.addEventListener('click', () => this.isDropdownVisible.set(false))
    const dropdownEl = createCustomElement<DropdownComponent>('rx-dropdown')
      .addEffect(self => { self.setAttribute('items', this.items()) })
      .addEventlistener('selected', e => this.selectedItems.set(e.detail))
    const inputEl = createElement('div')
      .addClass('selected-container')
      .addEffect(self => {
        self.set(
          ...Object.keys(this.selectedItems()).map(
            itemValue => createElement('div')
              .addClass('selected-item')
              .setHtmlContent(this.selectedItems()[itemValue])
          )
        )
      })
      .addEventlistener('click', ev => {
        ev.stopPropagation();
        this.isDropdownVisible.set(!this.isDropdownVisible())
      });
    return createElement('div')
      .addClass('wrapper')
      .append(inputEl)
      .addEffect(self => {
        if (this.isDropdownVisible()) {
          dropdownEl.hostElement.style.width = inputEl.hostElement.clientWidth + 'px';
          self.append(dropdownEl)
        } else {
          self.removeChild(dropdownEl)
        }
      })
  }
}
