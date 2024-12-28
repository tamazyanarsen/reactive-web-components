import { ComponentConfig } from "@shared/types";
import { BaseElement, component, createCustomElement, createElement, property, signal } from "@shared/utils";

import { MenuItem, MenuList } from "@fluentui/web-components";

interface MenuItemValue { label: string; value: string }
interface SelectedItem { [value: string]: string }

@component('fluent-select')
export class SelectFluentComponent extends BaseElement {
  @property()
  items = signal<MenuItemValue[]>([])

  selectedItems = signal<SelectedItem>({})

  isDropdownVisible = signal(false)

  rootStyle?: Promise<typeof import("*?raw")> | undefined = import('./select.scss?raw')

  render(): ComponentConfig {
    document.body.addEventListener('click', () => this.isDropdownVisible.set(false))
    const dropdownEl = createCustomElement<MenuList>('fluent-menu-list')
      .addClass('items-container')
      .addEffect(self =>
        self.set(
          ...this.items()
            .map(e => {
              return createCustomElement<MenuItem>('fluent-menu-item')
                .addEffect(self => {
                  const selectedItems = this.selectedItems()
                  if (e.value in selectedItems) self.addClass('selected')
                  else self.removeClass('selected')
                })
                .setHtmlContent(e.label)
                .addEventlistener('click', ev => {
                  ev.stopPropagation();
                  this.selectedItems.update(v => {
                    if (e.value in v) delete v[e.value]
                    else v[e.value] = e.label
                    if (this.items().length < 10) return v
                    this.items.update(v => {
                      const selected = this.selectedItems()
                      v.sort(
                        (a, b) =>
                          +!!selected[b.value] - +!!selected[a.value]
                      );
                      return v
                    })
                    return v
                  })
                })
            })
        )
      )
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
      //   TODO дописать появление dropdown
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
