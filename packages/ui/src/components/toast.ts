import {
  button,
  computed,
  configCustomComponent,
  css,
  defineComponent,
  div,
  each,
  effect,
  onCleanup,
  payload,
  signal,
  span,
  when,
  type RegisterOptions,
} from "@rwcjs/core";
import { tokens } from "../tokens";

export type ToastVariant = "neutral" | "success" | "warning" | "danger";
export type ToasterPlacement =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

/** Кнопка действия в уведомлении: «Отменить», «Повторить»... После нажатия уведомление закрывается. */
export type ToastAction = { label: string; onClick: () => void };

export type ToastOptions = {
  /** Свой id: повторный toast() с тем же id обновляет уведомление, а не добавляет новое. */
  id?: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  /** Через сколько миллисекунд закрыть; 0 или Infinity — висит до закрытия руками. */
  duration?: number;
  action?: ToastAction;
};

export type ToastRecord = {
  id: string;
  title: string;
  description: string;
  variant: ToastVariant;
  duration: number;
  action: ToastAction | null;
};

const DEFAULT_DURATION = 5000;

/**
 * Одно уведомление. Обычно его создаёт rwc-toaster из вызова toast(), но элемент
 * работает и сам по себе: таймер и кнопка закрытия только отправляют dismiss,
 * а убрать элемент — дело того, кто его вставил.
 *
 * Таймер стоит на паузе, пока над уведомлением курсор или внутри фокус: иначе
 * текст исчезнет посреди чтения, а кнопка действия — из-под пальца.
 */
export class Toast extends defineComponent({
  props: {
    /** Заголовок. */
    title: "",
    /** Пояснение под заголовком. */
    description: "",
    /** Смысл: определяет цвет и ARIA-роль. */
    variant: "neutral" as ToastVariant,
    /** Через сколько миллисекунд отправить dismiss; 0 или Infinity — не закрывать самому. */
    duration: DEFAULT_DURATION,
    /** Кнопка действия; после нажатия уведомление закрывается. */
    action: null as ToastAction | null,
    /** Подпись кнопки закрытия для вспомогательных технологий. */
    closeLabel: "Close",
  },
  events: {
    /** Пора закрыть: истёк таймер, нажата кнопка закрытия или действие. */
    dismiss: payload<void>(),
  },
  reflect: ["variant"],
  styles: [
    tokens,
    css`
      :host {
        display: block;
        pointer-events: auto;
        --_tone: var(--_text-muted);
      }
      :host([variant="success"]) {
        --_tone: var(--_success);
      }
      :host([variant="warning"]) {
        --_tone: var(--_warning);
      }
      :host([variant="danger"]) {
        --_tone: var(--_danger);
      }

      .toast {
        display: flex;
        align-items: flex-start;
        gap: calc(var(--_space) * 1.5);
        padding: calc(var(--_space) * 1.5) calc(var(--_space) * 2);
        border: 1px solid var(--_border);
        border-radius: var(--_radius);
        background: var(--_surface);
        color: var(--_text);
        box-shadow: var(--_shadow);
        line-height: 1.5;
        animation: enter calc(var(--_duration) * 2) ease-out;
      }

      .dot {
        flex: none;
        width: calc(var(--_space) * 0.75);
        height: calc(var(--_space) * 0.75);
        margin-top: 0.45em;
        border-radius: 50%;
        background: var(--_tone);
      }

      .content {
        flex: 1;
        min-width: 0;
      }
      .title {
        font-weight: 600;
      }
      .description {
        color: var(--_text-muted);
      }

      .action,
      .close {
        flex: none;
        font: inherit;
        cursor: pointer;
        transition:
          background var(--_duration),
          color var(--_duration);
      }

      .action {
        align-self: center;
        min-height: calc(var(--_control-height) - 8px);
        padding: 0 calc(var(--_space) * 1.5);
        font-weight: 500;
        border: 1px solid var(--_border);
        border-radius: var(--_radius-sm);
        background: var(--_surface);
        color: var(--_text);
      }
      .action:hover {
        background: var(--_surface-muted);
      }

      .close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
        margin: calc(var(--_space) * -0.25) calc(var(--_space) * -0.5) 0 0;
        padding: 0;
        font-size: 1.125rem;
        line-height: 1;
        border: none;
        border-radius: var(--_radius-sm);
        background: transparent;
        color: var(--_text-muted);
      }
      .close:hover {
        background: var(--_surface-muted);
        color: var(--_text);
      }

      @keyframes enter {
        from {
          opacity: 0;
          transform: translateY(calc(var(--_space) * var(--_enter-from, 1)));
        }
      }
    `,
  ],
}) {
  render() {
    const { title, description, variant, duration, action, closeLabel } = this.props;

    const hovered = signal(false);
    const focused = signal(false);
    const dismiss = () => this.events.dismiss();

    // Внешний эффект заводит отсчёт заново при смене duration, внутренний — ставит
    // таймер на остаток и снимает его на паузе. Таймеры гибнут вместе с эффектами,
    // то есть и с компонентом: отключённое уведомление dismiss не пришлёт.
    effect(() => {
      const total = duration();
      if (!Number.isFinite(total) || total <= 0) return;
      let remaining = total;

      effect(() => {
        if (hovered() || focused()) return;
        const startedAt = Date.now();
        const timer = setTimeout(dismiss, remaining);
        onCleanup(() => {
          clearTimeout(timer);
          remaining = Math.max(0, remaining - (Date.now() - startedAt));
        });
      });
    });

    return div(
      {
        class: "toast",
        attrs: {
          role: () => (variant() === "warning" || variant() === "danger" ? "alert" : "status"),
          "aria-atomic": "true",
        },
        "@mouseenter": () => hovered.set(true),
        "@mouseleave": () => hovered.set(false),
        "@focusin": () => focused.set(true),
        // Фокус ушёл на соседний элемент внутри уведомления — пауза продолжается.
        "@focusout": (event) => {
          const next = event.relatedTarget as Node | null;
          if (!next || !event.currentTarget.contains(next)) focused.set(false);
        },
      },
      span({ class: "dot", attrs: { "aria-hidden": "true" } }),
      div(
        { class: "content" },
        when(title, () => div({ class: "title" }, title)),
        when(description, () => div({ class: "description" }, description)),
      ),
      when(action, () =>
        button(
          {
            class: "action",
            attrs: { type: "button" },
            "@click": () => {
              action()?.onClick();
              dismiss();
            },
          },
          () => action()?.label ?? "",
        ),
      ),
      button(
        { class: "close", attrs: { type: "button", "aria-label": closeLabel }, "@click": dismiss },
        span({ attrs: { "aria-hidden": "true" } }, "×"),
      ),
    );
  }
}

// Хранилище уведомлений одно на модуль: toast() пишет в него откуда угодно,
// а каждый подключённый rwc-toaster его отображает.
const store = signal<readonly ToastRecord[]>([]);
let idCounter = 0;

/** Подключённые тостеры: поиск через DOM не нашёл бы тостер внутри чужого теневого корня. */
const liveToasters = new Set<Toaster>();

/**
 * Область уведомлений: <rwc-toaster placement="top-right"></rwc-toaster>.
 *
 * Ставить её руками не обязательно: первый toast() сам добавит тостер в document.body.
 * Своя разметка нужна, чтобы выбрать место, подпись области или контейнер. На странице
 * достаточно одного тостера: каждый показывает все уведомления.
 */
export class Toaster extends defineComponent({
  props: {
    /** Угол или край экрана, где появляются уведомления. */
    placement: "bottom-right" as ToasterPlacement,
    /** Имя области для вспомогательных технологий. */
    label: "Notifications",
  },
  reflect: ["placement"],
  styles: [
    tokens,
    css`
      :host {
        position: fixed;
        z-index: 1000;
        bottom: calc(var(--_space) * 2);
        right: calc(var(--_space) * 2);
        width: min(24rem, calc(100vw - var(--_space) * 4));
        pointer-events: none;
      }

      :host([placement^="top"]) {
        top: calc(var(--_space) * 2);
        bottom: auto;
        --_enter-from: -1;
      }
      :host([placement$="left"]) {
        left: calc(var(--_space) * 2);
        right: auto;
      }
      :host([placement$="center"]) {
        left: 50%;
        right: auto;
        transform: translateX(-50%);
      }

      /* Новое уведомление ближе к краю экрана: внизу — последним, вверху — первым. */
      .list {
        display: flex;
        flex-direction: column;
        gap: var(--_space);
      }
      :host([placement^="top"]) .list {
        flex-direction: column-reverse;
      }
    `,
  ],
}) {
  render() {
    effect(() => {
      liveToasters.add(this);
      onCleanup(() => liveToasters.delete(this));
    });

    return div(
      { attrs: { role: "region", "aria-label": this.props.label } },
      div(
        { class: "list", attrs: { "aria-live": "polite", "aria-relevant": "additions" } },
        each(
          store,
          (record) =>
            rwcToast({
              ".title": computed(() => record().title),
              ".description": computed(() => record().description),
              ".variant": computed(() => record().variant),
              ".duration": computed(() => record().duration),
              ".action": computed(() => record().action),
              "@dismiss": () => dismissToast(record.peek().id),
            }),
          (record) => record.id,
        ),
      ),
    );
  }
}

// Регистраторы порознь наружу не отдаём: тостер без rwc-toast упал бы на первом уведомлении.
const [rwcToast, registerToastElement] = configCustomComponent(Toast, "rwc-toast");
const [rwcToaster, registerToasterElement] = configCustomComponent(Toaster, "rwc-toaster");
export { rwcToast, rwcToaster };

/**
 * Регистрирует rwc-toast и rwc-toaster с одним постфиксом — тостер рендерит уведомления
 * фабрикой rwc-toast, поэтому порознь они не живут. Возвращает тег rwc-toast.
 */
export const registerToast = (options?: RegisterOptions) => {
  registerToasterElement(options);
  return registerToastElement(options);
};

/**
 * Показывает уведомление и возвращает его id:
 *
 *   toast("Сохранено");
 *   const id = toast({ title: "Ошибка", description: "Нет сети", variant: "danger", duration: 0 });
 *   dismissToast(id);
 *
 * Если ни один rwc-toaster не подключён, создаёт тостер в document.body. Тег берётся
 * из регистрации (Toaster.renderTagName), так что постфикс приложения учитывается.
 */
export const toast = (input: string | ToastOptions): string => {
  if (!Toaster.renderTagName || !Toast.renderTagName) {
    throw new Error("[rwc/ui] toast() needs the toaster: call registerToast() before showing notifications");
  }

  const options: ToastOptions = typeof input === "string" ? { title: input } : input;
  const id = options.id ?? `rwc-toast-${++idCounter}`;
  const record: ToastRecord = {
    id,
    title: options.title ?? "",
    description: options.description ?? "",
    variant: options.variant ?? "neutral",
    duration: options.duration ?? DEFAULT_DURATION,
    action: options.action ?? null,
  };

  if (liveToasters.size === 0 && typeof document !== "undefined") document.body.append(rwcToaster());

  store.update((list) =>
    list.some((item) => item.id === id) ? list.map((item) => (item.id === id ? record : item)) : [...list, record],
  );
  return id;
};

/** Закрывает уведомление по id; без аргумента — все. */
export const dismissToast = (id?: string) => {
  store.update((list) => (id === undefined ? [] : list.filter((item) => item.id !== id)));
};
