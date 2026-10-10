import { configCustomComponent, css, defineComponent, div, each, payload, signal, slot, span, onMount } from "@rwcjs/core";
import { tokens } from "../tokens";

export type RadioOption = { value: string; label: string; disabled?: boolean };
export type RadioGroupOrientation = "vertical" | "horizontal";

/** id подписи внутри теневого корня: он у каждого экземпляра свой, коллизий нет. */
const LABEL_ID = "label";

/**
 * Группа радиокнопок: rwcRadioGroup({ ".options": plans, ".value": "pro" }, "Тариф").
 *
 * Содержимое по умолчанию — подпись группы. Варианты передаются пропсом options, как
 * у rwc-select. Клавиатура по WAI-ARIA APG: в группу попадаешь одним Tab (roving tabindex),
 * стрелки переводят фокус и сразу выбирают соседний вариант по кругу, Space выбирает
 * вариант под фокусом.
 */
export class RadioGroup extends defineComponent({
  props: {
    /** Значение выбранного варианта; пустая строка — ничего не выбрано. */
    value: "",
    /** Варианты группы. */
    options: [] as RadioOption[],
    /** Раскладка: столбиком или в строку. */
    orientation: "vertical" as RadioGroupOrientation,
    /** Отключает всю группу; значение не уходит в форму. */
    disabled: false,
    /** Выбор обязателен: без него форма невалидна. */
    required: false,
  },
  events: {
    /** Пользователь выбрал вариант; payload — его value. */
    change: payload<string>(),
  },
  reflect: ["orientation", "disabled", "required"],
  form: true,
  shadow: { mode: "open", delegatesFocus: true },
  styles: [
    tokens,
    css`
      :host {
        display: block;
      }

      .label {
        margin-bottom: var(--_space);
        font-weight: 500;
      }
      .label.empty {
        display: none;
      }

      .group {
        display: flex;
        flex-direction: column;
        gap: var(--_space);
      }
      :host([orientation="horizontal"]) .group {
        flex-direction: row;
        flex-wrap: wrap;
        gap: calc(var(--_space) * 2);
      }

      .radio {
        display: inline-flex;
        align-items: center;
        gap: var(--_space);
        cursor: pointer;
        user-select: none;
      }
      /* Кольцо фокуса — на кружке, а не вокруг подписи. */
      .radio:focus-visible {
        box-shadow: none;
      }
      .radio:focus-visible .dot {
        box-shadow: var(--_focus-ring);
      }

      .dot {
        position: relative;
        flex: none;
        width: 16px;
        height: 16px;
        border: 1px solid var(--_border);
        border-radius: 50%;
        background: var(--_surface);
        transition:
          border-color var(--_duration),
          box-shadow var(--_duration);
      }
      .radio:hover .dot {
        border-color: var(--_text-muted);
      }
      .dot::after {
        content: "";
        position: absolute;
        inset: 3px;
        border-radius: 50%;
        background: var(--_accent);
        transform: scale(0);
        transition: transform var(--_duration);
      }
      .radio[aria-checked="true"] .dot {
        border-color: var(--_accent);
      }
      .radio[aria-checked="true"] .dot::after {
        transform: scale(1);
      }

      .radio[aria-disabled="true"] {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ],
}) {
  /** Значение на момент первого рендера — к нему возвращает сброс формы. */
  private defaultValue: string | null = null;

  private blocked = () => this.props.disabled() || this.formDisabled();

  /** Выбор пользователем: меняет value, шлёт change и переводит фокус на вариант. */
  private choose(item: RadioOption) {
    if (this.blocked() || item.disabled) return;
    const { value } = this.props;
    // Нативная радиокнопка не шлёт change, если её и так выбрали.
    if (value.peek() !== item.value) {
      value.set(item.value);
      this.events.change(item.value);
    }
    this.radioFor(item.value)?.focus();
  }

  private radioFor(itemValue: string) {
    return [...this.shadow.querySelectorAll<HTMLElement>("[role=radio]")].find(
      (radio) => radio.dataset.value === itemValue,
    );
  }

  render() {
    const { value, options, orientation, required } = this.props;
    this.defaultValue ??= value.peek();

    this.setFormValue(() => (this.blocked() || !value() ? null : value()));

    // Вариант, который получает Tab: выбранный, а если выбора нет — первый доступный.
    const tabStop = () => {
      const enabled = options().filter((item) => !item.disabled);
      return (enabled.find((item) => item.value === value()) ?? enabled[0])?.value;
    };

    const hasLabel = signal(false);

    const group = div(
      {
        class: "group",
        attrs: {
          role: "radiogroup",
          "aria-labelledby": () => (hasLabel() ? LABEL_ID : null),
          "aria-orientation": orientation,
          "aria-disabled": () => (this.blocked() ? "true" : null),
          "aria-required": () => (required() ? "true" : null),
        },
        "@keydown": (event) => {
          const radio = (event.target as Element).closest<HTMLElement>("[role=radio]");
          if (!radio) return;
          const current = radio.dataset.value;

          if (event.key === " ") {
            event.preventDefault();
            const item = options.peek().find((option) => option.value === current);
            if (item) this.choose(item);
            return;
          }

          // По APG стрелки работают одинаково в любой раскладке: вниз/вправо — следующий.
          const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
          if (!step || this.blocked()) return;
          event.preventDefault();
          const enabled = options.peek().filter((item) => !item.disabled);
          if (!enabled.length) return;
          const index = enabled.findIndex((item) => item.value === current);
          const next = enabled[(index + step + enabled.length) % enabled.length]!;
          this.choose(next);
        },
      },
      each(
        options,
        (item) =>
          div(
            {
              class: "radio",
              attrs: {
                role: "radio",
                "data-value": () => item().value,
                "aria-checked": () => (item().value === value() ? "true" : "false"),
                "aria-disabled": () => (this.blocked() || item().disabled ? "true" : null),
                // Roving tabindex: в порядок Tab попадает один вариант, остальные — по стрелкам.
                tabindex: () =>
                  this.blocked() || item().disabled ? null : item().value === tabStop() ? "0" : "-1",
              },
              "@click": () => this.choose(item.peek()),
            },
            span({ class: "dot", attrs: { "aria-hidden": "true" } }),
            span({ class: "text" }, () => item().label),
          ),
        (item) => item.value,
      ),
    );

    // Проверяем сразу, иначе до монтирования группа считалась бы валидной. А якорь
    // подсказки — только после вставки: вне теневого корня setValidity бросает
    // NotFoundError. mounted перезапускает проверку, как только варианты на месте.
    const mounted = signal(false);
    onMount(() => mounted.set(true));

    this.addEffect(() => {
      if (required() && !value() && !this.blocked()) {
        const first = mounted() ? (this.shadow.querySelector<HTMLElement>("[role=radio]") ?? undefined) : undefined;
        this.internals.setValidity({ valueMissing: true }, "Please select one of these options.", first);
      } else {
        this.internals.setValidity({});
      }
    });

    return [
      div(
        { class: ["label", { empty: () => !hasLabel() }], attrs: { id: LABEL_ID } },
        slot({
          "@slotchange": (event) => hasLabel.set(event.currentTarget.assignedNodes().length > 0),
        }),
      ),
      group,
    ];
  }

  /** Сброс формы возвращает только выбор: варианты и раскладка — настройки, а не данные. */
  protected override formReset() {
    this.props.value.set(this.defaultValue ?? "");
  }
}

export const [rwcRadioGroup, registerRadioGroup] = configCustomComponent(RadioGroup, "rwc-radio-group");
