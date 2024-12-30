import { ComponentConfig, ListItem, SelectedItem } from "@shared/types";
import { BaseElement, component, createElement, event, newEventEmitter, property, signal } from "@shared/utils";

@component('rx-dropdown')
export class DropdownComponent extends BaseElement {
  rootStyle?: Promise<typeof import("*?raw")> | undefined = import('./dropdown.scss?raw');

  @property()
  items = signal<ListItem[]>([])

  @event()
  selected = newEventEmitter<SelectedItem>()

  selectedItems = signal<SelectedItem>({})

  render(): ComponentConfig {
    return createElement('div')
      .addClass('items-container')
      .addEffect(self => {
        self.set(
          ...this.items()
            .map(e => {
              return createElement('div')
                .addClass('item')
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
                  });
                  this.selected(this.selectedItems())
                })
            })
        )
      })
  }
}
