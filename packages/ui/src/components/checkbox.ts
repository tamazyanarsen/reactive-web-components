import { configCustomComponent, css, defineComponent, div, payload, slot, span, onMount, signal } from "@rwcjs/core";
import { tokens } from "../tokens";

/**
 * Флажок: <rwc-checkbox name="terms" required>Принимаю условия</rwc-checkbox>.
 *
 * Подпись — содержимое по умолчанию. Внутри не нативный input, а элемент с role="checkbox":
 * подпись лежит внутри него, поэтому доступное имя берётся из содержимого, а клик по
 * тексту переключает флажок без связки label/for через теневую границу.
 */
export class Checkbox extends defineComponent({
  props: {
    /** Отмечен ли флажок. */
    checked: false,
    /** Промежуточное состояние («выбрано частично»); снимается первым же переключением. */
    indeterminate: false,
    /** Отключает флажок; значение не уходит в форму. */
    disabled: false,
    /** Флажок обязателен: без отметки форма невалидна. */
    required: false,
    /** Значение, которое уходит в форму у отмеченного флажка. */
    value: "on",
  },
  events: {
    /** Пользователь переключил флажок; payload — новое значение checked. */
    change: payload<boolean>(),
  },
  reflect: ["checked", "indeterminate", "disabled", "required"],
  form: true,
  shadow: { mode: "open", delegatesFocus: true },
  styles: [
    tokens,
    css`
      :host {
        display: inline-block;
        vertical-align: middle;
      }

      .root {
        display: inline-flex;
        align-items: center;
        gap: var(--_space);
        cursor: pointer;
        user-select: none;
      }
      /* Кольцо фокуса — на квадратике, а не вокруг всей подписи. */
      .root:focus-visible {
        box-shadow: none;
      }
      .root:focus-visible .box {
        box-shadow: var(--_focus-ring);
      }

      .box {
        position: relative;
        flex: none;
        width: 16px;
        height: 16px;
        border: 1px solid var(--_border);
        border-radius: var(--_radius-sm);
        background: var(--_surface);
        transition:
          background var(--_duration),
          border-color var(--_duration),
          box-shadow var(--_duration);
      }
      .root:hover .box {
        border-color: var(--_text-muted);
      }

      :host([checked]) .box,
      :host([indeterminate]) .box {
        background: var(--_accent);
        border-color: var(--_accent);
      }

      /* Галочка — повёрнутый уголок из двух рамок, без картинок: цвет берётся из темы. */
      .box::after {
        content: "";
        position: absolute;
        opacity: 0;
        transition: opacity var(--_duration);
      }
      :host([checked]) .box::after {
        opacity: 1;
        left: 4.5px;
        top: 1.5px;
        width: 5px;
        height: 9px;
        border: solid var(--_accent-contrast);
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
      :host([indeterminate]) .box::after {
        opacity: 1;
        left: 3px;
        top: 6px;
        width: 8px;
        height: 2px;
        border: none;
        background: var(--_accent-contrast);
        transform: none;
      }

      :host([disabled]) .root {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ],
}) {
  /** Отметка на момент первого рендера — к ней возвращает сброс формы, как defaultChecked. */
  private defaultChecked: boolean | null = null;

  private blocked = () => this.props.disabled() || this.formDisabled();

  constructor() {
    super();
    // Слушаем хост, а не внутренний элемент: сюда же приходит клик от внешнего <label for>.
    this.addEventListener("click", () => this.toggle());
  }

  private toggle() {
    if (this.blocked()) return;
    const { checked, indeterminate } = this.props;
    indeterminate.set(false);
    checked.set(!checked.peek());
    this.events.change(checked.peek());
  }

  render() {
    const { checked, indeterminate, required, value } = this.props;
    this.defaultChecked ??= checked.peek();

    this.setFormValue(() => (this.blocked() || !checked() ? null : value()));

    const root = div(
      {
        class: "root",
        attrs: {
          role: "checkbox",
          tabindex: () => (this.blocked() ? null : "0"),
          "aria-checked": () => (indeterminate() ? "mixed" : checked() ? "true" : "false"),
          "aria-disabled": () => (this.blocked() ? "true" : null),
          "aria-required": () => (required() ? "true" : null),
        },
        "@keydown": (event) => {
          // Space переключает, как у нативного флажка; preventDefault — чтобы не прокручивать страницу.
          if (event.key !== " ") return;
          event.preventDefault();
          this.toggle();
        },
      },
      span({ class: "box", attrs: { "aria-hidden": "true" } }),
      span({ class: "label" }, slot()),
    );

    // Проверяем сразу, иначе до монтирования элемент считался бы валидным. А якорь
    // подсказки — только после вставки: вне теневого корня setValidity бросает
    // NotFoundError. mounted перезапускает проверку, как только якорь на месте.
    const mounted = signal(false);
    onMount(() => mounted.set(true));
    const anchor = () => (mounted() ? root : undefined);

    this.addEffect(() => {
      if (required() && !checked() && !this.blocked()) {
        this.internals.setValidity({ valueMissing: true }, "Please check this box if you want to proceed.", anchor());
      } else {
        this.internals.setValidity({});
      }
    });

    return root;
  }

  /** Сброс формы возвращает только отметку: value и прочее — настройки, а не данные. */
  protected override formReset() {
    this.props.checked.set(this.defaultChecked ?? false);
  }
}

export const [rwcCheckbox, registerCheckbox] = configCustomComponent(Checkbox, "rwc-checkbox");
