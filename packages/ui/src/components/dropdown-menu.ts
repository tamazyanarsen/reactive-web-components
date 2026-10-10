import {
  configCustomComponent,
  css,
  defineComponent,
  div,
  dynamic,
  effect,
  onCleanup,
  payload,
  signal,
  slot,
  span,
  untracked,
} from "@rwcjs/core";
import { tokens } from "../tokens";
import { anchoredPanelStyles, listen, supportsTopLayer } from "../overlay";
import type { PopoverAlign, PopoverPlacement } from "./popover";

export type MenuItem = { value: string; label: string; disabled?: boolean } | { separator: true };

type ActionItem = Extract<MenuItem, { value: string }>;

const isAction = (item: MenuItem): item is ActionItem => !("separator" in item);

/**
 * Кнопка с меню по шаблону WAI-ARIA APG «Menu Button»:
 * <rwc-dropdown-menu .items=${[…]}><rwc-button slot="trigger">Действия</rwc-button></rwc-dropdown-menu>.
 *
 * Пункты рисует сам компонент из пропса items — так у них гарантированно role="menuitem"
 * и управляемый фокус. Клавиатура: стрелки, Home/End, поиск по первой букве, Enter/Space
 * выбирают, Escape закрывает и возвращает фокус на триггер, Tab закрывает без возврата.
 * Раскладка та же, что у rwc-popover.
 */
export class DropdownMenu extends defineComponent({
  props: {
    /** Открыто ли меню. */
    open: false,
    /** Пункты меню и разделители. */
    items: [] as MenuItem[],
    /** Сторона триггера, у которой появляется меню. */
    placement: "bottom" as PopoverPlacement,
    /** Выравнивание меню вдоль стороны триггера. */
    align: "start" as PopoverAlign,
    /** Доступное имя меню. */
    label: "",
  },
  events: {
    /** Выбран пункт; detail — его value. */
    select: payload<string>(),
  },
  reflect: ["open", "placement", "align"],
  styles: [
    tokens,
    anchoredPanelStyles,
    css`
      .panel {
        padding: calc(var(--_space) / 2);
        min-width: 10rem;
      }

      .item {
        display: flex;
        align-items: center;
        min-height: calc(var(--_control-height) - 4px);
        padding: 0 var(--_space);
        border-radius: var(--_radius-sm);
        cursor: pointer;
        user-select: none;
        outline: none;
        transition: background var(--_duration);
      }

      .item:hover,
      .item:focus {
        background: var(--_surface-muted);
      }

      .item[aria-disabled="true"] {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .separator {
        height: 1px;
        margin: calc(var(--_space) / 2) calc(var(--_space) * -0.5);
        background: var(--_border);
      }
    `,
  ],
}) {
  private shown = false;

  /** Открывает меню; фокус уходит на первый (или последний) доступный пункт. */
  show(focus: "first" | "last" = "first") {
    this.initialFocus = focus;
    this.props.open.set(true);
  }

  /** Закрывает меню; returnFocus — вернуть ли фокус на триггер. */
  hide(returnFocus = true) {
    if (!this.props.open.peek()) return;
    this.returnFocus = returnFocus;
    this.props.open.set(false);
  }

  private initialFocus: "first" | "last" = "first";
  private returnFocus = true;

  private findTrigger() {
    return this.querySelector<HTMLElement>(':scope > [slot="trigger"]');
  }

  render() {
    const { open, items, label } = this.props;
    const topLayer = supportsTopLayer();
    const trigger = signal(this.findTrigger());

    const menu = div(
      {
        class: "panel",
        attrs: {
          role: "menu",
          tabindex: "-1",
          popover: topLayer ? "manual" : null,
          "aria-label": () => label() || null,
          "aria-orientation": "vertical",
        },
        "@keydown": (event) => this.onMenuKey(event),
        "@click": (event) => {
          const item = (event.target as Element).closest<HTMLElement>(".item");
          if (item) this.choose(item);
        },
        "@pointermove": (event) => {
          // Наведение переносит фокус, как в нативных меню: стрелки продолжат с этого пункта.
          const item = (event.target as Element).closest<HTMLElement>(".item");
          if (item && item.getAttribute("aria-disabled") !== "true" && this.shadowRoot!.activeElement !== item) {
            item.focus();
          }
        },
      },
      dynamic(() =>
        items().map((item) =>
          isAction(item)
            ? div(
                {
                  class: "item",
                  attrs: {
                    role: "menuitem",
                    tabindex: "-1",
                    "data-value": item.value,
                    "aria-disabled": item.disabled ? "true" : null,
                  },
                },
                item.label,
              )
            : div({ class: "separator", attrs: { role: "separator" } }),
        ),
      ),
    );

    effect(() => {
      const element = trigger();
      if (!element) return;
      element.setAttribute("aria-haspopup", "menu");
      element.setAttribute("aria-expanded", String(open()));
      onCleanup(() => {
        element.removeAttribute("aria-haspopup");
        element.removeAttribute("aria-expanded");
      });
    });

    effect(() => {
      listen(this, "click", (event) => {
        const element = trigger.peek();
        if (!element || !event.composedPath().includes(element)) return;
        if (this.props.open.peek()) this.hide();
        else this.show("first");
      });
      // Enter и Space на триггере-кнопке и так дают click; стрелки открывают меню сами.
      listen(this, "keydown", (event) => {
        const element = trigger.peek();
        if (!element || !event.composedPath().includes(element)) return;
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        event.preventDefault();
        this.show(event.key === "ArrowDown" ? "first" : "last");
      });
      listen(this, "focusout", (event) => {
        const next = event.relatedTarget;
        if (next instanceof Element && !this.contains(next) && !this.shadowRoot!.contains(next)) this.hide(false);
      });
    });

    effect(() => {
      if (!open()) return;
      listen(document, "pointerdown", (event) => {
        if (!event.composedPath().includes(this)) this.hide(false);
      });
    });

    const sync = () => {
      const want = this.props.open.peek();
      if (want === this.shown || !menu.isConnected) return;
      this.shown = want;
      this.toggleAttribute("open", want);
      if (want) {
        if (topLayer) menu.showPopover();
        const enabled = this.enabledItems();
        ((this.initialFocus === "last" ? enabled.at(-1) : enabled[0]) ?? menu).focus();
        this.initialFocus = "first";
        return;
      }
      if (topLayer && menu.matches(":popover-open")) menu.hidePopover();
      if (this.returnFocus) trigger.peek()?.focus();
      this.returnFocus = true;
    };

    effect(() => {
      open();
      if (menu.isConnected) untracked(sync);
      else queueMicrotask(sync);
    });

    effect(() => onCleanup(() => (this.shown = false)));

    return [
      span(
        { class: "trigger" },
        slot({ ".name": "trigger", "@slotchange": () => trigger.set(this.findTrigger()) }),
      ),
      menu,
    ];
  }

  /** Пункты, по которым ходит фокус: отключённые пропускаются. */
  private enabledItems() {
    return [...this.shadowRoot!.querySelectorAll<HTMLElement>('.item:not([aria-disabled="true"])')];
  }

  private choose(item: HTMLElement) {
    if (item.getAttribute("aria-disabled") === "true") return;
    const value = item.dataset.value ?? "";
    this.hide(true);
    this.events.select(value);
  }

  /** Поиск по первым буквам: символы, набранные подряд за полсекунды, складываются. */
  private typeahead = "";
  private typeaheadTimer: ReturnType<typeof setTimeout> | undefined;

  private onMenuKey(event: KeyboardEvent) {
    const items = this.enabledItems();
    const current = items.indexOf(this.shadowRoot!.activeElement as HTMLElement);
    const focusAt = (index: number) => items[(index + items.length) % items.length]?.focus();

    switch (event.key) {
      case "ArrowDown":
        focusAt(current + 1);
        break;
      case "ArrowUp":
        focusAt(current < 0 ? -1 : current - 1);
        break;
      case "Home":
        focusAt(0);
        break;
      case "End":
        focusAt(-1);
        break;
      case "Enter":
      case " ": {
        const item = items[current];
        if (item) this.choose(item);
        break;
      }
      case "Escape":
        this.hide(true);
        break;
      case "Tab":
        this.hide(false);
        return;
      default: {
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
        clearTimeout(this.typeaheadTimer);
        this.typeaheadTimer = setTimeout(() => (this.typeahead = ""), 500);
        this.typeahead += event.key.toLowerCase();
        // Одна и та же буква подряд перебирает пункты на неё, а не ищет «аа».
        const repeated = [...this.typeahead].every((char) => char === this.typeahead[0]);
        const query = repeated ? this.typeahead[0]! : this.typeahead;
        const start = repeated ? current + 1 : Math.max(current, 0);
        const ordered = [...items.slice(start), ...items.slice(0, start)];
        ordered.find((item) => item.textContent!.trim().toLowerCase().startsWith(query))?.focus();
      }
    }
    event.preventDefault();
    event.stopPropagation();
  }
}

export const [rwcDropdownMenu, registerDropdownMenu] = configCustomComponent(DropdownMenu, "rwc-dropdown-menu");
