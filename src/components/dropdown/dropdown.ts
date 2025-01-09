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

  @property()
  isMultiSelect = signal(true)

  render(): ComponentConfig {
    return createElement('div')
      .addClass('items-container')
      .addEffect(self => {
        console.log('DROPDOWN FIRST EFFECT');
        this.selectedItems = signal<SelectedItem>(this.selectedItems())
        self.set(
          ...this.items()
            .map(e => {
              return createElement('div')
                .addClass('item')
                .addEffect(self => {
                  console.log('DROPDOWN SECOND EFFECT');
                  const selectedItems = this.selectedItems()
                  if (e.value in selectedItems) self.addClass('selected')
                  else self.removeClass('selected')
                })
                .setHtmlContent(e.label)
                .addEventlistener('click', ev => {
                  ev.stopPropagation();
                  this.selectedItems.update(oldSelected => {
                    if (e.value in oldSelected) delete oldSelected[e.value]
                    else {
                      if (!this.isMultiSelect()) oldSelected = {}
                      oldSelected[e.value] = e.label
                    }
                    if (this.items().length < 10) return oldSelected
                    this.items.update(oldItems => {
                      const selected = this.selectedItems()
                      oldItems.sort(
                        (a, b) =>
                          +!!selected[b.value] - +!!selected[a.value]
                      );
                      return oldItems
                    })
                    return oldSelected
                  });
                  this.selected(this.selectedItems())
                })
            })
        )
      })
  }
}
