import { configCustomComponent, css, defineComponent, effect, img, signal, span, when } from "@rwcjs/core";
import { tokens } from "../tokens";

export type AvatarSize = "sm" | "md" | "lg";
export type AvatarShape = "circle" | "square";

/** Инициалы: первые буквы первого и последнего слова. Array.from — чтобы не резать суррогатные пары. */
const initialsOf = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  if (!first) return "";
  const last = words.length > 1 ? words[words.length - 1]! : "";
  return (Array.from(first)[0]! + (Array.from(last)[0] ?? "")).toUpperCase();
};

/**
 * Аватар: <rwc-avatar src="/u/42.png" name="Ада Лавлейс"></rwc-avatar>.
 *
 * Пока src нет или картинка не загрузилась, показывает инициалы из name — элементом с
 * role="img" и aria-label, чтобы скринридер прочитал имя, а не две буквы.
 */
export class Avatar extends defineComponent({
  props: {
    /** Адрес картинки. */
    src: "",
    /** Текстовая альтернатива; по умолчанию — name. */
    alt: "",
    /** Имя: из него берутся инициалы, когда картинки нет. */
    name: "",
    /** Размер. */
    size: "md" as AvatarSize,
    /** Форма: круг или скруглённый квадрат. */
    shape: "circle" as AvatarShape,
  },
  reflect: ["size", "shape"],
  styles: [
    tokens,
    css`
      :host {
        display: inline-flex;
        vertical-align: middle;
        flex: none;
        --_avatar-size: var(--_control-height);
      }
      :host([size="sm"]) {
        --_avatar-size: calc(var(--_control-height) - 8px);
      }
      :host([size="lg"]) {
        --_avatar-size: calc(var(--_control-height) + 12px);
      }

      .avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--_avatar-size);
        height: var(--_avatar-size);
        overflow: hidden;
        border-radius: 50%;
        background: var(--_surface-muted);
        color: var(--_text-muted);
        font-size: calc(var(--_avatar-size) * 0.4);
        font-weight: 600;
        line-height: 1;
        user-select: none;
      }
      :host([shape="square"]) .avatar {
        border-radius: var(--_radius);
      }

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    `,
  ],
}) {
  render() {
    const { src, alt, name } = this.props;
    const failed = signal(false);
    const label = () => (alt() || name()).trim();

    // Новый адрес — новая попытка: прошлая ошибка к нему не относится.
    effect(() => {
      src();
      failed.set(false);
    });

    return span(
      { class: "avatar", attrs: { part: "avatar" } },
      when(
        () => src() !== "" && !failed(),
        () => img({ attrs: { src, alt: label }, "@error": () => failed.set(true) }),
        () =>
          span(
            {
              class: "initials",
              attrs: {
                role: () => (label() ? "img" : null),
                "aria-label": () => label() || null,
                // Без имени показывать нечего и читать нечего.
                "aria-hidden": () => (label() ? null : "true"),
              },
            },
            () => initialsOf(name()),
          ),
      ),
    );
  }
}

export const [rwcAvatar, registerAvatar] = configCustomComponent(Avatar, "rwc-avatar");
