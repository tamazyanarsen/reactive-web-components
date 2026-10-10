import { configCustomComponent, css, defineComponent, div, option, payload, select, span, onMount, signal } from "@rwcjs/core";
import { controlStyles, tokens } from "../tokens";

export type SelectOption = { value: string; label: string; disabled?: boolean };

/**
 * Выпадающий список: rwcSelect({ ".options": [{ value: "ru", label: "Русский" }], ".value": "ru" }).
 *
 * Внутри — нативный <select>: доступность, клавиатура и системный список на мобильных
 * достаются даром. Варианты передаются пропсом options, а не дочерними <option>, — нативный
 * select не видит элементы из светлого DOM через теневую границу.
 */
export class Select extends defineComponent({
  props: {
    /** Значение выбранного варианта; пустая строка — ничего не выбрано. */
    value: "",
    /** Варианты списка. */
    options: [] as SelectOption[],
    /** Текст, пока ничего не выбрано. */
    placeholder: "",
    /** Отключает список; значение не уходит в форму. */
    disabled: false,
    /** Выбор обязателен: без него форма невалидна. */
    required: false,
    /** Помечает список ошибочным (красная рамка) — для валидации снаружи. */
    invalid: false,
  },
  events: {
    /** Пользователь выбрал вариант; payload — его value. */
    change: payload<string>(),
  },
  reflect: ["disabled", "required", "invalid"],
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

      .wrap {
        position: relative;
      }

      /* select.control, а не select: общий .control задаёт padding и иначе перебил бы
         правый отступ под стрелку — текст уезжал под неё. */
      select.control {
        display: block;
        width: 100%;
        appearance: none;
        padding-right: calc(var(--_space) * 4);
        cursor: pointer;
      }
      select:focus-visible {
        border-color: var(--_accent);
      }
      select.empty {
        color: var(--_text-muted);
      }
      option {
        color: var(--_text);
        background: var(--_surface);
      }

      /* Стрелка — повёрнутый уголок рамки: цвет из темы, без картинок. */
      .chevron {
        position: absolute;
        top: 50%;
        right: calc(var(--_space) * 1.5);
        width: 7px;
        height: 7px;
        margin-top: -5px;
        border: solid var(--_text-muted);
        border-width: 0 1.5px 1.5px 0;
        transform: rotate(45deg);
        pointer-events: none;
      }
      :host([disabled]) .chevron {
        opacity: 0.5;
      }
    `,
  ],
}) {
  /** Значение на момент первого рендера — к нему возвращает сброс формы. */
  private defaultValue: string | null = null;

  render() {
    const { value, options, placeholder, disabled, required, invalid } = this.props;
    this.defaultValue ??= value.peek();
    const blocked = () => disabled() || this.formDisabled();

    // Пустое значение — это подсказка или «ничего»: нативный select такое не отправляет.
    this.setFormValue(() => (blocked() || !value() ? null : value()));

    const field = select({
      class: ["control", { empty: () => !value() }],
      ".disabled": blocked,
      ".required": required,
      attrs: { "aria-invalid": () => (invalid() ? "true" : null) },
      "@input": (event) => event.stopPropagation(),
      "@change": (event) => {
        // Нативный change не составной и наружу не выходит, но гасим на всякий случай,
        // чтобы на хосте был ровно один change — наш, с detail.
        event.stopPropagation();
        value.set(event.currentTarget.value);
        this.events.change(event.currentTarget.value);
      },
    });

    // Варианты пересобираются целиком: их обычно немного, а выбор после пересборки
    // восстанавливается из value. Значение читается через peek — за ним следит эффект ниже,
    // и порядок двух эффектов не важен.
    this.addEffect(() => {
      const hint = placeholder();
      field.replaceChildren(
        ...(hint ? [option({ ".value": "", ".disabled": true, ".hidden": true }, hint)] : []),
        ...options().map((item) => option({ ".value": item.value, ".disabled": !!item.disabled }, item.label)),
      );
      field.value = value.peek();
    });
    this.addEffect(() => {
      field.value = value();
    });

    // Проверяем сразу, иначе до монтирования элемент считался бы валидным. А якорь
    // подсказки — только после вставки: вне теневого корня setValidity бросает
    // NotFoundError. mounted перезапускает проверку, как только якорь на месте.
    const mounted = signal(false);
    onMount(() => mounted.set(true));
    const anchor = () => (mounted() ? field : undefined);

    this.addEffect(() => {
      if (required() && !value() && !blocked()) {
        this.internals.setValidity({ valueMissing: true }, "Please select an item in the list.", anchor());
      } else {
        this.internals.setValidity({});
      }
    });

    return div({ class: "wrap" }, field, span({ class: "chevron", attrs: { "aria-hidden": "true" } }));
  }

  /** Сброс формы возвращает только выбор: варианты и подсказка — настройки, а не данные. */
  protected override formReset() {
    this.props.value.set(this.defaultValue ?? "");
  }
}

export const [rwcSelect, registerSelect] = configCustomComponent(Select, "rwc-select");
