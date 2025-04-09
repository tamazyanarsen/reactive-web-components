import { ListItem, SelectedItem } from "../../../shared/types/list.type";
import {
  BaseElement,
  component,
  createCustomElement,
  createElement,
  property,
  signal,
  effect,
} from "../../../shared";
import { DropdownComponent } from "../../dropdown/dropdown";

@component("rx-select")
export class SelectComponent extends BaseElement {
  @property()
  items = signal<ListItem[]>([]);

  @property()
  isMulti = signal(true);

  selectedItems = signal<SelectedItem>({});

  isDropdownVisible = signal(false);

  rootStyle?: Promise<typeof import("*?raw")> | undefined = import(
    "./select.scss?raw"
  );

  render() {
    const dropdownEl = createCustomElement<DropdownComponent>("rx-dropdown")
      .addClass("dropdown")
      .setReactiveAttribute("isMultiSelect", this.isMulti)
      .setReactiveAttribute("items", this.items)
      .addEventlistener("selected", (e) => {
        if (!this.isMulti()) {
          this.isDropdownVisible.set(false);
        }
        this.selectedItems.set(e.detail);
      });

    const inputEl = createElement("div")
      .addClass("selected-container")
      .addEffect((self) => {
        self.set(
          ...Object.keys(this.selectedItems()).map((itemValue) =>
            createElement("div")
              .addClass("selected-item")
              .addReactiveClass({ "selected-item-max-width": this.isMulti })
              .setHtmlContent(this.selectedItems()[itemValue]),
          ),
        );
      })
      .addEventlistener("click", (ev) => {
        ev.stopPropagation();
        this.isDropdownVisible.set(!this.isDropdownVisible());
      });

    const handleDocumentClick = () => {
      this.isDropdownVisible.set(false);
    };

    setTimeout(() => {
      document.addEventListener("click", handleDocumentClick);
    }, 0);

    const wrapper = createElement("div")
      .addClass("wrapper")
      .append(inputEl);

    effect(() => {
      if (this.isDropdownVisible()) {
        (dropdownEl as any).isMultiSelect = this.isMulti();
        (dropdownEl as any).items = this.items();
        
        dropdownEl.hostElement.style.width =
          inputEl.hostElement.getClientRects().item(0)?.width + "px";
        wrapper.append(dropdownEl);
      } else {
        wrapper.removeChild(dropdownEl);
      }
    });

    return wrapper;
  }
}
