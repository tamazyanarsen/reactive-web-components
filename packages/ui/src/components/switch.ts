import { configCustomComponent, css, defineComponent, div, payload, slot, span, onMount, signal } from "@rwcjs/core";
import { tokens } from "../tokens";

/**
 * Переключатель: <rwc-switch name="notifications" checked>Уведомления</rwc-switch>.
 *
 * Тот же контракт, что у rwc-checkbox, но role="switch" — «включено/выключено», без
 * промежуточного состояния. Подпись — содержимое по умолчанию.
 */
export class Switch extends defineComponent({
  props: {
    /** Включён ли переключатель. */
    checked: false,
    /** Отключает переключатель; значение не уходит в форму. */
    disabled: false,
    /** Переключатель обязателен: выключенный делает форму невалидной. */
    required: false,
    /** Значение, которое уходит в форму у включённого переключателя. */
    value: "on",
  },
  events: {
    /** Пользователь переключил; payload — новое значение checked. */
    change: payload<boolean>(),
  },
  reflect: ["checked", "disabled", "required"],
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
      /* Кольцо фокуса — на дорожке, а не вокруг всей подписи. */
      .root:focus-visible {
        box-shadow: none;
      }
      .root:focus-visible .track {
        box-shadow: var(--_focus-ring);
      }

      .track {
        position: relative;
        flex: none;
        width: 36px;
        height: 20px;
        padding: 2px;
        border-radius: 999px;
        background: var(--_border);
        transition:
          background var(--_duration),
          box-shadow var(--_duration);
      }
      :host([checked]) .track {
        background: var(--_accent);
      }

      .thumb {
        display: block;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--_surface);
        box-shadow: var(--_shadow);
        transition: transform var(--_duration);
      }
      :host([checked]) .thumb {
        transform: translateX(16px);
      }

      :host([disabled]) .root {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ],
}) {
  /** Состояние на момент первого рендера — к нему возвращает сброс формы. */
  private defaultChecked: boolean | null = null;

  private blocked = () => this.props.disabled() || this.formDisabled();

  constructor() {
    super();
    // Слушаем хост, а не внутренний элемент: сюда же приходит клик от внешнего <label for>.
    this.addEventListener("click", () => this.toggle());
  }

  private toggle() {
    if (this.blocked()) return;
    const { checked } = this.props;
    checked.set(!checked.peek());
    this.events.change(checked.peek());
  }

  render() {
    const { checked, required, value } = this.props;
    this.defaultChecked ??= checked.peek();

    this.setFormValue(() => (this.blocked() || !checked() ? null : value()));

    const root = div(
      {
        class: "root",
        attrs: {
          role: "switch",
          tabindex: () => (this.blocked() ? null : "0"),
          "aria-checked": () => (checked() ? "true" : "false"),
          "aria-disabled": () => (this.blocked() ? "true" : null),
          "aria-required": () => (required() ? "true" : null),
        },
        "@keydown": (event) => {
          // По APG переключает Space, Enter — по желанию; берём оба, как у кнопки.
          if (event.key !== " " && event.key !== "Enter") return;
          event.preventDefault();
          this.toggle();
        },
      },
      span({ class: "track", attrs: { "aria-hidden": "true" } }, span({ class: "thumb" })),
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
        this.internals.setValidity({ valueMissing: true }, "Please turn this on if you want to proceed.", anchor());
      } else {
        this.internals.setValidity({});
      }
    });

    return root;
  }

  /** Сброс формы возвращает только состояние: value — настройка, а не данные. */
  protected override formReset() {
    this.props.checked.set(this.defaultChecked ?? false);
  }
}

export const [rwcSwitch, registerSwitch] = configCustomComponent(Switch, "rwc-switch");
