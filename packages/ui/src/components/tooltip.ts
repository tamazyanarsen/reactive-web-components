import { configCustomComponent, css, defineComponent, div, effect, onCleanup, signal, slot } from "@rwcjs/core";
import { tokens } from "../tokens";
import { listen } from "../overlay";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

let tooltipCounter = 0;

/**
 * Подсказка над триггером: <rwc-tooltip content="Копировать"><button>…</button></rwc-tooltip>.
 *
 * Появляется при наведении (после delay) и сразу при фокусе, прячется по Escape, уходу мыши
 * и потере фокуса. Положение — чистый CSS: absolute относительно хоста.
 *
 * Доступность. Фокус получает слотированный триггер в светлом DOM, а пузырь живёт в теневом
 * корне — aria-describedby через эту границу не работает, а описание на хосте (через
 * ElementInternals) читалка не объявит: фокус не на хосте. Поэтому описание ставится прямо
 * на триггер, и всегда в пределах одного дерева:
 * - текст из слота content уже лежит в светлом DOM рядом с триггером — триггер ссылается
 *   на него через aria-describedby (id и role="tooltip" выдаются, если их нет);
 * - текст из пропса content кладётся в aria-description триггера (ARIA 1.3, есть во всех
 *   движках) — без вставки служебных узлов в чужой светлый DOM.
 * Пузырь остаётся role="tooltip"; закрытый, он visibility: hidden и выпадает из дерева доступности.
 */
export class Tooltip extends defineComponent({
  props: {
    /** Текст подсказки; для разметки — слот content. */
    content: "",
    /** Сторона триггера, у которой появляется подсказка. */
    placement: "top" as TooltipPlacement,
    /** Задержка появления при наведении, мс. */
    delay: 300,
    /** Видна ли подсказка сейчас. */
    open: false,
  },
  reflect: ["placement", "open"],
  styles: [
    tokens,
    css`
      :host {
        position: relative;
        display: inline-block;
      }

      /* Обёртка шире пузыря на величину зазора: мышь переходит на пузырь, не покидая хост. */
      .tooltip {
        position: absolute;
        z-index: 50;
        width: max-content;
        max-width: 18rem;
        visibility: hidden;
        opacity: 0;
        pointer-events: none;
        transition:
          opacity var(--_duration),
          visibility var(--_duration);
      }

      :host([open]) .tooltip {
        visibility: visible;
        opacity: 1;
        pointer-events: auto;
      }

      .bubble {
        padding: calc(var(--_space) * 0.5) var(--_space);
        border-radius: var(--_radius-sm);
        background: var(--_text);
        color: var(--_surface);
        font-size: 0.85em;
        line-height: 1.4;
        box-shadow: var(--_shadow);
      }

      :host(:not([placement])) .tooltip,
      :host([placement="top"]) .tooltip {
        bottom: 100%;
        left: 50%;
        translate: -50% 0;
        padding-bottom: calc(var(--_space) * 0.75);
      }
      :host([placement="bottom"]) .tooltip {
        top: 100%;
        left: 50%;
        translate: -50% 0;
        padding-top: calc(var(--_space) * 0.75);
      }
      :host([placement="left"]) .tooltip {
        right: 100%;
        top: 50%;
        translate: 0 -50%;
        padding-right: calc(var(--_space) * 0.75);
      }
      :host([placement="right"]) .tooltip {
        left: 100%;
        top: 50%;
        translate: 0 -50%;
        padding-left: calc(var(--_space) * 0.75);
      }
    `,
  ],
}) {
  /** Показывает подсказку сразу, без задержки. */
  show() {
    this.props.open.set(true);
  }

  /** Прячет подсказку. */
  hide() {
    this.props.open.set(false);
  }

  /** Триггер — первый ребёнок без атрибута slot. */
  private findTrigger() {
    return this.querySelector<HTMLElement>(":scope > :not([slot])");
  }

  private findContent() {
    return this.querySelector<HTMLElement>(':scope > [slot="content"]');
  }

  render() {
    const { content, delay, open } = this.props;
    const trigger = signal(this.findTrigger());
    const slotted = signal(this.findContent());

    let timer: ReturnType<typeof setTimeout> | undefined;
    const cancel = () => clearTimeout(timer);
    const hide = () => {
      cancel();
      this.hide();
    };

    effect(() => {
      listen(this, "mouseenter", () => {
        cancel();
        timer = setTimeout(() => this.show(), delay.peek());
      });
      listen(this, "mouseleave", hide);
      listen(this, "focusin", () => {
        cancel();
        this.show();
      });
      listen(this, "focusout", (event) => {
        const next = event.relatedTarget;
        if (!(next instanceof Node) || !this.contains(next)) hide();
      });
      onCleanup(cancel);
    });

    // Escape закрывает подсказку, где бы ни был фокус: её могли показать наведением.
    effect(() => {
      if (!open()) return;
      listen(document, "keydown", (event) => {
        if (event.key === "Escape") hide();
      });
    });

    // Связь триггера с текстом подсказки — см. комментарий к классу.
    effect(() => {
      const target = trigger();
      if (!target) return;
      const described = slotted();
      if (described) {
        // Префикс — тег подсказки, чтобы id не совпали у двух версий кита на одной странице.
        if (!described.id) described.id = `${this.localName}-${++tooltipCounter}`;
        if (!described.hasAttribute("role")) described.setAttribute("role", "tooltip");
        target.setAttribute("aria-describedby", described.id);
        onCleanup(() => target.removeAttribute("aria-describedby"));
        return;
      }
      const text = content();
      if (!text) return;
      target.setAttribute("aria-description", text);
      onCleanup(() => target.removeAttribute("aria-description"));
    });

    return [
      slot({ "@slotchange": () => trigger.set(this.findTrigger()) }),
      div(
        { class: "tooltip" },
        div(
          { class: "bubble", attrs: { role: "tooltip" } },
          slot({ ".name": "content", "@slotchange": () => slotted.set(this.findContent()) }, content),
        ),
      ),
    ];
  }
}

export const [rwcTooltip, registerTooltip] = configCustomComponent(Tooltip, "rwc-tooltip");
