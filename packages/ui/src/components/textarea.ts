import { configCustomComponent, css, defineComponent, payload, textarea, onMount, signal } from "@rwcjs/core";
import { controlStyles, tokens } from "../tokens";

/**
 * Многострочное поле: <rwc-textarea name="comment" rows="5"></rwc-textarea>.
 *
 * Тот же контракт, что у rwc-input: нативный <textarea> внутри, имя в форме — из
 * атрибута name на хосте, события input на каждый ввод и change на фиксацию.
 */
export class Textarea extends defineComponent({
  props: {
    /** Текущее значение. */
    value: "",
    /** Видимая высота в строках. */
    rows: 3,
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
    /** Пользователь закончил правку: потеря фокуса. */
    change: payload<string>(),
  },
  reflect: ["disabled", "required", "readonly", "invalid"],
  form: true,
  shadow: { mode: "open", delegatesFocus: true },
  styles: [
    tokens,
    controlStyles,
    css`
      :host {
        display: inline-block;
        vertical-align: top;
      }

      textarea {
        display: block;
        width: 100%;
        padding: var(--_space) calc(var(--_space) * 1.5);
        line-height: 1.5;
        resize: vertical;
      }

      textarea::placeholder {
        color: var(--_text-muted);
      }

      textarea:focus-visible {
        border-color: var(--_accent);
      }

      :host([readonly]) textarea {
        background: var(--_surface-muted);
      }
      :host([disabled]) textarea,
      :host([readonly]) textarea {
        resize: none;
      }
    `,
  ],
}) {
  /** Значение на момент первого рендера — к нему возвращает сброс формы, как defaultValue. */
  private defaultValue: string | null = null;

  render() {
    const { value, rows, placeholder, disabled, required, readonly, invalid, minlength, maxlength } = this.props;
    this.defaultValue ??= value.peek();
    const blocked = () => disabled() || this.formDisabled();

    // Отключённое поле в форму не попадает — как у нативного.
    this.setFormValue(() => (blocked() ? null : value()));

    const field = textarea({
      class: "control",
      ".value": value,
      ".rows": rows,
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
        // Нативный input составной и вышел бы наружу вторым событием без detail.
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
      // Отключённые и readonly-поля, как и нативные, в проверке не участвуют.
      if (blocked() || readonly()) return this.internals.setValidity({});
      if (required() && !current) {
        return this.internals.setValidity({ valueMissing: true }, "Please fill out this field.", anchor());
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

  /** Сброс формы трогает только значение, настройки поля — не данные. */
  protected override formReset() {
    this.props.value.set(this.defaultValue ?? "");
  }
}

export const [rwcTextarea, registerTextarea] = configCustomComponent(Textarea, "rwc-textarea");
