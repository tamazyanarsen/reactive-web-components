import {
  configCustomComponent,
  css,
  defineComponent,
  div,
  effect,
  onCleanup,
  payload,
  signal,
  slot,
  span,
  untracked,
} from "@rwcjs/core";
import { anchoredPanelStyles, deepActiveElement, focusFirstIn, listen, supportsTopLayer } from "../overlay";
import { tokens } from "../tokens";

export type PopoverPlacement = "top" | "bottom" | "left" | "right";
export type PopoverAlign = "start" | "center" | "end";
export type PopoverCloseReason = "escape" | "outside" | "trigger" | "api";

// --- rwc-popover --------------------------------------------------------------

/**
 * Всплывающая панель у триггера:
 * <rwc-popover><rwc-button slot="trigger">Фильтры</rwc-button>…содержимое…</rwc-popover>.
 *
 * Открывается кликом по триггеру, закрывается повторным кликом, Escape и кликом снаружи.
 * Popover API используется в режиме manual: auto сам закрывает панель на pointerdown по
 * триггеру, и следующий click тут же открывал бы её снова — а слотированный триггер не может
 * стать popovertarget через границу теневого корня. Лёгкое закрытие поэтому своё, одно на оба режима.
 */
export class Popover extends defineComponent({
  props: {
    /** Открыта ли панель. */
    open: false,
    /** Сторона триггера, у которой появляется панель. */
    placement: "bottom" as PopoverPlacement,
    /** Выравнивание панели вдоль стороны триггера. */
    align: "start" as PopoverAlign,
    /** Доступное имя панели (role="dialog"). */
    label: "",
  },
  events: {
    /** Панель открылась. */
    open: payload<void>(),
    /** Панель закрылась; detail — причина: escape, outside, trigger или api. */
    close: payload<PopoverCloseReason>(),
  },
  reflect: ["open", "placement", "align"],
  styles: [
    tokens,
    anchoredPanelStyles,
    css`
      .panel {
        padding: calc(var(--_space) * 1.5);
      }
      .panel:focus-visible {
        box-shadow: var(--_shadow), var(--_focus-ring);
      }
    `,
  ],
}) {
  private shown = false;
  private closeReason: PopoverCloseReason = "api";

  /** Открывает панель. */
  show() {
    this.props.open.set(true);
  }

  /** Закрывает панель с указанной причиной. */
  hide(reason: PopoverCloseReason = "api") {
    if (!this.props.open.peek()) return;
    this.closeReason = reason;
    this.props.open.set(false);
  }

  /** Триггер — первый ребёнок со slot="trigger". */
  private findTrigger() {
    return this.querySelector<HTMLElement>(':scope > [slot="trigger"]');
  }

  render() {
    const { open, label } = this.props;
    const topLayer = supportsTopLayer();
    const trigger = signal(this.findTrigger());
    const bodySlot = slot();

    const panel = div(
      {
        class: "panel",
        attrs: {
          role: "dialog",
          tabindex: "-1",
          popover: topLayer ? "manual" : null,
          "aria-label": () => label() || null,
        },
      },
      bodySlot,
    );

    // ARIA-состояние ставим прямо на слотированный триггер: именно он получает фокус,
    // а aria-controls через границу теневого корня всё равно не работает.
    effect(() => {
      const element = trigger();
      if (!element) return;
      element.setAttribute("aria-haspopup", "dialog");
      element.setAttribute("aria-expanded", String(open()));
      onCleanup(() => {
        element.removeAttribute("aria-haspopup");
        element.removeAttribute("aria-expanded");
      });
    });

    // Слушаем на хосте: события слотированных детей приходят к нему в любом окружении.
    effect(() => {
      listen(this, "click", (event) => {
        const element = trigger.peek();
        if (!element || !event.composedPath().includes(element)) return;
        if (this.props.open.peek()) this.hide("trigger");
        else this.show();
      });
      listen(this, "keydown", (event) => {
        if (event.key !== "Escape" || !this.props.open.peek()) return;
        event.preventDefault();
        event.stopPropagation();
        this.hide("escape");
      });
      // Фокус ушёл Tab-ом за пределы компонента — панель больше не нужна.
      listen(this, "focusout", (event) => {
        const next = event.relatedTarget;
        if (next instanceof Element && !this.owns(next)) this.hide("outside");
      });
    });

    // Клик снаружи закрывает — слушатель на документе живёт, только пока панель открыта.
    effect(() => {
      if (!open()) return;
      listen(document, "pointerdown", (event) => {
        if (!event.composedPath().includes(this)) this.hide("outside");
      });
    });

    const sync = () => {
      const want = this.props.open.peek();
      if (want === this.shown || !panel.isConnected) return;
      this.shown = want;
      // Атрибут ставим сразу, а не ждём отражения: фокус в display:none не попадает.
      this.toggleAttribute("open", want);
      if (want) {
        if (topLayer) panel.showPopover();
        focusFirstIn([bodySlot], panel);
        this.events.open();
        return;
      }
      if (topLayer && panel.matches(":popover-open")) panel.hidePopover();
      const reason = this.closeReason;
      this.closeReason = "api";
      // Клик снаружи уводит фокус туда, куда кликнули; в остальных случаях — назад к триггеру.
      if (reason !== "outside" && (this.owns(deepActiveElement()) || reason !== "api")) trigger.peek()?.focus();
      this.events.close(reason);
    };

    effect(() => {
      open();
      if (panel.isConnected) untracked(sync);
      else queueMicrotask(sync);
    });

    effect(() => onCleanup(() => (this.shown = false)));

    return [
      span(
        { class: "trigger" },
        slot({ ".name": "trigger", "@slotchange": () => trigger.set(this.findTrigger()) }),
      ),
      panel,
    ];
  }

  private owns(node: Element | null) {
    return !!node && (this.contains(node) || this.shadowRoot!.contains(node));
  }
}

export const [rwcPopover, registerPopover] = configCustomComponent(Popover, "rwc-popover");
