import { configCustomComponent, css, defineComponent, effect, signal, slot, span } from "@rwcjs/core";
import { tokens } from "../tokens";

export type DividerOrientation = "horizontal" | "vertical";

/**
 * Разделитель: <rwc-divider></rwc-divider> или с подписью по центру —
 * <rwc-divider>или</rwc-divider>.
 *
 * role="separator" стоит на самом хосте: именно он занимает место в раскладке, и
 * скринридер встречает разделитель там, где его видно.
 */
export class Divider extends defineComponent({
  props: {
    /** Направление: горизонтальная линия или вертикальная между элементами строки. */
    orientation: "horizontal" as DividerOrientation,
  },
  reflect: ["orientation"],
  styles: [
    tokens,
    css`
      :host {
        display: flex;
        align-items: center;
        gap: calc(var(--_space) * 1.5);
        margin: calc(var(--_space) * 2) 0;
        color: var(--_text-muted);
        font-size: 0.75rem;
      }
      :host([orientation="vertical"]) {
        display: inline-flex;
        flex-direction: column;
        align-self: stretch;
        min-height: 1em;
        margin: 0 var(--_space);
        vertical-align: middle;
      }

      .line {
        flex: 1;
        background: var(--_border);
      }
      :host(:not([orientation="vertical"])) .line {
        height: 1px;
      }
      :host([orientation="vertical"]) .line {
        width: 1px;
      }

      /* Без подписи две половины сходятся в одну линию — зазор не нужен. */
      :host(:not([labelled])) {
        gap: 0;
      }
      [hidden] {
        display: none !important;
      }
    `,
  ],
}) {
  private syncSlot = () => {};

  override connectedCallback() {
    if (!this.hasAttribute("role")) this.setAttribute("role", "separator");
    super.connectedCallback();
    // slotchange не обязан прийти для детей, которые уже лежали в хосте до рендера.
    this.syncSlot();
  }

  render() {
    const { orientation } = this.props;
    const labelled = signal(false);
    const labelSlot = slot({ "@slotchange": () => this.syncSlot() });

    // Пробелы и переводы строк из разметки — не подпись.
    this.syncSlot = () =>
      labelled.set(
        labelSlot
          .assignedNodes()
          .some((node) => node.nodeType !== Node.TEXT_NODE || node.textContent!.trim() !== ""),
      );

    effect(() => this.setAttribute("aria-orientation", orientation()));
    // Атрибут хоста — чтобы стили могли убрать зазор у линии без подписи.
    effect(() => this.toggleAttribute("labelled", labelled()));

    return [
      span({ class: "line", attrs: { "aria-hidden": "true" } }),
      span({ class: "label", attrs: { part: "label", hidden: () => !labelled() } }, labelSlot),
      span({ class: "line", attrs: { "aria-hidden": "true" } }),
    ];
  }
}

export const [rwcDivider, registerDivider] = configCustomComponent(Divider, "rwc-divider");
