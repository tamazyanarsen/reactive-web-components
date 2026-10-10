import { configCustomComponent, css, defineComponent, div, signal, slot } from "@rwcjs/core";
import { tokens } from "../tokens";

export type CardVariant = "outlined" | "elevated" | "filled";

/**
 * Карточка: контейнер со слотами "header", по умолчанию и "footer".
 *
 *   rwcCard({ ".variant": "elevated" },
 *     h3({ attrs: { slot: "header" } }, "Заголовок"),
 *     p("Содержимое"),
 *     div({ attrs: { slot: "footer" } }, rwcButton("Ок")),
 *   )
 *
 * Обёртки шапки и подвала с их отступами и разделителями скрываются, пока их слот
 * пуст, — иначе карточка без шапки получила бы лишнюю полосу сверху.
 */
export class Card extends defineComponent({
  props: {
    /** Внешний вид: рамка, тень или заливка. */
    variant: "outlined" as CardVariant,
  },
  reflect: ["variant"],
  styles: [
    tokens,
    css`
      :host {
        display: block;
        border: 1px solid var(--_border);
        border-radius: var(--_radius);
        background: var(--_surface);
        color: var(--_text);
        overflow: hidden;
      }
      :host([variant="elevated"]) {
        border-color: transparent;
        box-shadow: var(--_shadow);
      }
      :host([variant="filled"]) {
        border-color: transparent;
        background: var(--_surface-muted);
      }

      [hidden] {
        display: none !important;
      }

      .header,
      .body,
      .footer {
        padding: calc(var(--_space) * 2);
      }
      .header {
        padding-bottom: 0;
        font-weight: 600;
      }
      .footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: var(--_space);
        padding-top: 0;
      }
    `,
  ],
}) {
  private syncSlots = () => {};

  override connectedCallback() {
    super.connectedCallback();
    // slotchange не обязан прийти для детей, которые уже лежали в хосте до рендера.
    this.syncSlots();
  }

  render() {
    const hasHeader = signal(false);
    const hasFooter = signal(false);
    const headerSlot = slot({ ".name": "header", "@slotchange": () => this.syncSlots() });
    const footerSlot = slot({ ".name": "footer", "@slotchange": () => this.syncSlots() });

    this.syncSlots = () => {
      hasHeader.set(headerSlot.assignedNodes().length > 0);
      hasFooter.set(footerSlot.assignedNodes().length > 0);
    };

    return [
      div({ class: "header", attrs: { part: "header", hidden: () => !hasHeader() } }, headerSlot),
      div({ class: "body", attrs: { part: "body" } }, slot()),
      div({ class: "footer", attrs: { part: "footer", hidden: () => !hasFooter() } }, footerSlot),
    ];
  }
}

export const [rwcCard, registerCard] = configCustomComponent(Card, "rwc-card");
