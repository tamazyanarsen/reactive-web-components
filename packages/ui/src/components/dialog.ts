import {
  configCustomComponent,
  css,
  defineComponent,
  dialog,
  div,
  effect,
  onCleanup,
  payload,
  signal,
  slot,
  untracked,
} from "@rwcjs/core";
import { tokens } from "../tokens";
import { deepActiveElement, focusFirstIn } from "../overlay";

export type DialogCloseReason = "escape" | "backdrop" | "api";

/**
 * Модальный диалог на нативном <dialog>:
 * <rwc-dialog open label="Удалить файл?">Текст<div slot="footer">…</div></rwc-dialog>.
 *
 * showModal() даёт всё, что положено модальному окну, без собственного кода: верхний слой,
 * ловушку фокуса и инертный фон. Escape и клик по подложке перехватываются, чтобы
 * знать причину закрытия и держать пропс open в согласии с реальным состоянием.
 */
export class Dialog extends defineComponent({
  props: {
    /** Открыт ли диалог; диалог сам сбрасывает его, когда закрывается. */
    open: false,
    /** Модальный режим: подложка, ловушка фокуса и инертный фон. */
    modal: true,
    /** Доступное имя диалога; без него имя берётся из слота header. */
    label: "",
    /** Закрывать по клику на подложку. */
    closeOnBackdrop: true,
  },
  events: {
    /** Диалог открылся. */
    open: payload<void>(),
    /** Диалог закрылся; detail — причина: escape, backdrop или api. */
    close: payload<DialogCloseReason>(),
  },
  reflect: ["open", "modal"],
  styles: [
    tokens,
    css`
      :host {
        display: contents;
      }

      dialog {
        /* Отступов у самого <dialog> нет: клик по нему — это клик по подложке. */
        padding: 0;
        border: 1px solid var(--_border);
        border-radius: var(--_radius);
        background: var(--_surface);
        color: var(--_text);
        box-shadow: var(--_shadow);
        width: min(32rem, calc(100vw - var(--_space) * 4));
        max-height: calc(100vh - var(--_space) * 8);
        font: inherit;
      }

      dialog[open] {
        animation: dialog-in var(--_duration) ease-out;
      }

      dialog::backdrop {
        background: var(--_overlay);
        animation: fade-in var(--_duration) ease-out;
      }

      .panel {
        display: flex;
        flex-direction: column;
        gap: calc(var(--_space) * 2);
        padding: calc(var(--_space) * 3);
        max-height: inherit;
        overflow: auto;
      }

      .header {
        font-size: 1.125em;
        font-weight: 600;
      }

      .footer {
        display: flex;
        justify-content: flex-end;
        gap: var(--_space);
      }

      @keyframes dialog-in {
        from {
          opacity: 0;
          transform: translateY(4px) scale(0.98);
        }
      }

      @keyframes fade-in {
        from {
          opacity: 0;
        }
      }
    `,
  ],
}) {
  /** Состояние, которое диалог реально показывает; пропс open — желаемое. */
  private shown = false;
  /** Причина ближайшего закрытия; всё, что не Escape и не подложка, — api. */
  private closeReason: DialogCloseReason = "api";
  /** Куда вернуть фокус после закрытия. */
  private returnFocus: HTMLElement | null = null;

  /** Открывает диалог. */
  show() {
    this.props.open.set(true);
  }

  /** Закрывает диалог с указанной причиной. */
  hide(reason: DialogCloseReason = "api") {
    if (!this.props.open.peek()) return;
    this.closeReason = reason;
    this.props.open.set(false);
  }

  render() {
    const { open, modal, label, closeOnBackdrop } = this.props;

    // Пустые header и footer прячем, иначе они дают лишний gap. slotchange приходит не во
    // всех окружениях, поэтому начальное состояние берём из детей хоста.
    const filled = (name: string) => {
      const filledSignal = signal(!!this.querySelector(`:scope > [slot="${name}"]`));
      const element = slot({
        ".name": name,
        "@slotchange": () => filledSignal.set(element.assignedNodes().length > 0),
      });
      return [element, filledSignal] as const;
    };
    const [headerSlot, hasHeader] = filled("header");
    const [footerSlot, hasFooter] = filled("footer");
    const bodySlot = slot();

    // Где началось нажатие: выделение текста, отпущенное над подложкой, не закрывает диалог.
    let downOnBackdrop = true;

    const element = dialog(
      {
        attrs: {
          "aria-label": () => label() || null,
          "aria-labelledby": () => (label() || !hasHeader() ? null : "header"),
          "aria-modal": () => (modal() ? "true" : null),
          // Запасная цель фокуса, если внутри нечего фокусировать.
          tabindex: "-1",
        },
        "@pointerdown": (event) => {
          downOnBackdrop = event.target === element;
        },
        "@click": (event) => {
          const onBackdrop = event.target === element && downOnBackdrop;
          downOnBackdrop = true;
          if (onBackdrop && modal() && closeOnBackdrop()) this.hide("backdrop");
        },
        // Escape обрабатываем сами: браузер закрыл бы диалог в обход пропса и без причины.
        "@keydown": (event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          event.stopPropagation();
          this.hide("escape");
        },
        "@cancel": (event) => {
          event.preventDefault();
          this.hide("escape");
        },
        // Закрыли в обход компонента (form method="dialog", element.close()) — догоняем пропс.
        "@close": () => {
          if (this.shown) this.hide("api");
        },
      },
      div(
        { class: "panel" },
        div({ class: "header", attrs: { id: "header" }, show: hasHeader }, headerSlot),
        div({ class: "body" }, bodySlot),
        div({ class: "footer", show: hasFooter }, footerSlot),
      ),
    );

    const openNative = () => {
      if (modal() && typeof element.showModal === "function") element.showModal();
      else if (typeof element.show === "function") element.show();
      else element.setAttribute("open", "");
      // showModal сам ставит фокус, но слотированное содержимое находит не везде.
      if (!this.owns(deepActiveElement())) focusFirstIn([headerSlot, bodySlot, footerSlot], element);
    };

    const closeNative = () => {
      if (typeof element.close === "function") element.close();
      else element.removeAttribute("open");
    };

    const sync = () => {
      const want = this.props.open.peek();
      if (want === this.shown || !element.isConnected) return;
      this.shown = want;
      if (want) {
        this.returnFocus = deepActiveElement();
        openNative();
        this.events.open();
        return;
      }
      closeNative();
      const reason = this.closeReason;
      this.closeReason = "api";
      const target = this.returnFocus;
      this.returnFocus = null;
      if (target?.isConnected) target.focus();
      this.events.close(reason);
    };

    // showModal требует, чтобы <dialog> был в документе, а во время render() он ещё не вставлен.
    effect(() => {
      open();
      if (element.isConnected) untracked(sync);
      else queueMicrotask(sync);
    });

    effect(() => {
      onCleanup(() => {
        // Отключённый компонент не должен держать фон инертным.
        if (this.shown) closeNative();
        this.shown = false;
      });
    });

    return element;
  }

  /** Элемент внутри диалога — в теневом корне или среди слотированных детей. */
  private owns(node: Element | null) {
    return !!node && (this.contains(node) || this.shadowRoot!.contains(node));
  }
}

export const [rwcDialog, registerDialog] = configCustomComponent(Dialog, "rwc-dialog");
