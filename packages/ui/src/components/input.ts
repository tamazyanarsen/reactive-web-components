import { configCustomComponent, css, defineComponent, input, payload, onMount, signal } from "@rwcjs/core";
import { controlStyles, tokens } from "../tokens";

export type InputType = "text" | "email" | "password" | "search" | "tel" | "url" | "number";

/** Упрощённая проверка адреса: та же, что у нативного type=email, без подробностей RFC. */
const EMAIL = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Текстовое поле: <rwc-input name="email" type="email" required></rwc-input>.
 *
 * Внутри — нативный <input>, поэтому клавиатура, автозаполнение и экранные читалки
 * работают как обычно. Имя поля в форме берётся из атрибута name на хосте — так устроены
 * все form-associated элементы, отдельный пропс не нужен.
 */
export class Input extends defineComponent({
  props: {
    /** Текущее значение. */
    value: "",
    /** Тип поля, как у нативного input. */
    type: "text" as InputType,
    /** Подсказка в пустом поле. */
    placeholder: "",
    /** Отключает поле; значение не уходит в форму. */
    disabled: false,
    /** Поле обязательно: пустое значение делает форму невалидной. */
    required: false,
    /** Только чтение: значение видно и уходит в форму, но не редактируется. */
    readonly: false,
    /** Помечает поле ошибочным (красная рамка) — для валидации снаружи. */
    invalid: false,
    /** Минимальная длина непустого значения. */
    minlength: null as number | null,
    /** Максимальная длина: длиннее ввести нельзя. */
    maxlength: null as number | null,
  },
  events: {
    /** Каждое изменение текста пользователем. */
    input: payload<string>(),
    /** Пользователь закончил правку: потеря фокуса или Enter. */
    change: payload<string>(),
  },
  reflect: ["type", "disabled", "required", "readonly", "invalid"],
  form: true,
  shadow: { mode: "open", delegatesFocus: true },
  styles: [
    tokens,
    controlStyles,
    css`
      :host {
        display: inline-block;
        vertical-align: middle;
      }

      input {
        display: block;
        width: 100%;
      }

      input::placeholder {
        color: var(--_text-muted);
      }

      input:focus-visible {
        border-color: var(--_accent);
      }

      :host([readonly]) input {
        background: var(--_surface-muted);
      }
    `,
  ],
}) {
  /** Значение на момент первого рендера — к нему возвращает сброс формы, как defaultValue. */
  private defaultValue: string | null = null;

  render() {
    const { value, type, placeholder, disabled, required, readonly, invalid, minlength, maxlength } = this.props;
    this.defaultValue ??= value.peek();
    const blocked = () => disabled() || this.formDisabled();

    // Отключённое поле в форму не попадает — как у нативного.
    this.setFormValue(() => (blocked() ? null : value()));

    const field = input({
      class: "control",
      ".value": value,
      ".type": type,
      ".disabled": blocked,
      ".readOnly": readonly,
      ".required": required,
      attrs: {
        placeholder: () => placeholder() || null,
        minlength: minlength,
        maxlength: maxlength,
        "aria-invalid": () => (invalid() ? "true" : null),
      },
      "@input": (event) => {
        // Нативный input составной (composed) и вышел бы за теневую границу вторым
        // событием без detail — гасим его, наружу уходит только наше.
        event.stopPropagation();
        value.set(event.currentTarget.value);
        this.events.input(event.currentTarget.value);
      },
      "@change": (event) => {
        event.stopPropagation();
        this.events.change(event.currentTarget.value);
      },
    });

    // Проверяем сразу, иначе до монтирования элемент считался бы валидным. А якорь
    // подсказки — только после вставки: вне теневого корня setValidity бросает
    // NotFoundError. mounted перезапускает проверку, как только якорь на месте.
    const mounted = signal(false);
    onMount(() => mounted.set(true));
    const anchor = () => (mounted() ? field : undefined);

    this.addEffect(() => {
      const current = value();
      const min = minlength();
      // Отключённые поля, как и нативные, в проверке не участвуют.
      if (blocked() || readonly()) return this.internals.setValidity({});
      if (required() && !current) {
        return this.internals.setValidity({ valueMissing: true }, "Please fill out this field.", anchor());
      }
      if (type() === "email" && current && !EMAIL.test(current)) {
        return this.internals.setValidity({ typeMismatch: true }, "Please enter an email address.", anchor());
      }
      if (min !== null && current && current.length < min) {
        return this.internals.setValidity(
          { tooShort: true },
          `Please use at least ${min} characters (currently ${current.length}).`,
          anchor(),
        );
      }
      this.internals.setValidity({});
    });

    return field;
  }

  /** Сброс формы трогает только значение: тип, подсказка и прочие настройки — не данные. */
  protected override formReset() {
    this.props.value.set(this.defaultValue ?? "");
  }
}

export const [rwcInput, registerInput] = configCustomComponent(Input, "rwc-input");
