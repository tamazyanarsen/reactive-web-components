import { ListItem, SelectedItem } from "../../shared/types/list.type";
import {
  BaseElement,
  component,
  createElement,
  event,
  newEventEmitter,
  property,
  signal,
} from "../../shared";

@component("rx-dropdown")
export class DropdownComponent extends BaseElement {
  rootStyle?: Promise<typeof import("*?raw")> | undefined = import(
    "./dropdown.scss?raw"
  );

  @property()
  items = signal<ListItem[]>([]);

  @event()
  selected = newEventEmitter<SelectedItem>();

  selectedItems = signal<SelectedItem>({});

  @property()
  isMultiSelect = signal(true);

  render() {
    console.log("RENDER dropdown");
    return createElement("div")
      .addClass("items-container")
      .addEffect((self) => {
        console.log("EFFECT", this.items());
        // Создаем элементы списка
        const itemElements = this.items().map((item) => {
          const itemEl = createElement("div")
            .addClass("item")
            .setHtmlContent(item.label)
            .addEventlistener("click", (ev) => {
              ev.stopPropagation();
              this.handleItemClick(item);
            });

          // Добавляем класс selected если элемент выбран
          if (item.value in this.selectedItems()) {
            itemEl.addClass("selected");
          }

          return itemEl;
        });

        // Обновляем содержимое контейнера
        self.set(...itemElements);
      });
  }

  private handleItemClick(item: ListItem) {
    this.selectedItems.update((oldSelected) => {
      // Создаем новый объект для выбранных элементов
      const newSelected = { ...oldSelected };
      
      if (item.value in newSelected) {
        // Удаляем элемент если он уже выбран
        delete newSelected[item.value];
      } else {
        if (!this.isMultiSelect()) {
          // Для одиночного выбора создаем новый объект с одним элементом
          return { [item.value]: item.label };
        }
        // Для множественного выбора добавляем к существующим
        newSelected[item.value] = item.label;
      }

      // Сортировка если элементов больше 10
      if (this.items().length >= 10) {
        this.items.update((oldItems) => {
          return [...oldItems].sort((a, b) => {
            const aSelected = a.value in newSelected;
            const bSelected = b.value in newSelected;
            return Number(bSelected) - Number(aSelected);
          });
        });
      }

      return newSelected;
    });

    // Эмитим событие выбора
    this.selected(this.selectedItems());
  }
}
