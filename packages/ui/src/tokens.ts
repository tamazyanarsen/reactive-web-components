import { css } from "@rwcjs/core";

/**
 * Токены темы. Каждый компонент кладёт этот лист первым в свои стили — CSS-строка одна
 * и та же, поэтому браузер разбирает её один раз и раздаёт всем общим CSSStyleSheet.
 *
 * Публичные переменные --rwc-* задаёт приложение (на :root или любом предке), внутри
 * компонентов читаются приватные --_*: у каждой есть значение по умолчанию для светлой
 * и тёмной схемы. Так кит выглядит прилично без настройки, а перекрасить его — значит
 * задать несколько --rwc-* (или подключить theme.css и править его).
 */
export const tokens = css`
  :host {
    --_accent: var(--rwc-accent, #4f46e5);
    --_accent-hover: var(--rwc-accent-hover, #4338ca);
    --_accent-contrast: var(--rwc-accent-contrast, #ffffff);
    --_danger: var(--rwc-danger, #dc2626);
    --_success: var(--rwc-success, #16a34a);
    --_warning: var(--rwc-warning, #d97706);

    --_surface: var(--rwc-surface, #ffffff);
    --_surface-muted: var(--rwc-surface-muted, #f4f4f5);
    --_text: var(--rwc-text, #18181b);
    --_text-muted: var(--rwc-text-muted, #71717a);
    --_border: var(--rwc-border, #d4d4d8);
    --_overlay: var(--rwc-overlay, rgb(0 0 0 / 0.4));

    --_radius: var(--rwc-radius, 8px);
    --_radius-sm: var(--rwc-radius-sm, 4px);
    --_space: var(--rwc-space, 8px);
    --_font: var(--rwc-font, inherit);
    --_font-size: var(--rwc-font-size, 0.875rem);
    --_control-height: var(--rwc-control-height, 36px);
    --_focus-ring: var(--rwc-focus-ring, 0 0 0 2px var(--_surface), 0 0 0 4px var(--_accent));
    --_shadow: var(--rwc-shadow, 0 4px 16px rgb(0 0 0 / 0.12));
    --_duration: var(--rwc-duration, 150ms);

    font-family: var(--_font);
    font-size: var(--_font-size);
    color: var(--_text);
  }

  @media (prefers-color-scheme: dark) {
    :host {
      --_accent: var(--rwc-accent, #818cf8);
      --_accent-hover: var(--rwc-accent-hover, #a5b4fc);
      --_accent-contrast: var(--rwc-accent-contrast, #0b0b0f);
      --_danger: var(--rwc-danger, #f87171);
      --_success: var(--rwc-success, #4ade80);
      --_warning: var(--rwc-warning, #fbbf24);
      --_surface: var(--rwc-surface, #18181b);
      --_surface-muted: var(--rwc-surface-muted, #27272a);
      --_text: var(--rwc-text, #fafafa);
      --_text-muted: var(--rwc-text-muted, #a1a1aa);
      --_border: var(--rwc-border, #3f3f46);
      --_shadow: var(--rwc-shadow, 0 4px 16px rgb(0 0 0 / 0.5));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :host {
      --_duration: 0ms;
    }
  }

  :host([hidden]) {
    display: none !important;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  :focus-visible {
    outline: none;
    box-shadow: var(--_focus-ring);
  }
`;

/**
 * Общая база для контролов форм: высота, рамка, состояния disabled и invalid.
 * Класс .control вешается на сам интерактивный элемент внутри теневого корня.
 */
export const controlStyles = css`
  .control {
    font: inherit;
    color: var(--_text);
    background: var(--_surface);
    border: 1px solid var(--_border);
    border-radius: var(--_radius);
    min-height: var(--_control-height);
    padding: 0 calc(var(--_space) * 1.5);
    transition:
      border-color var(--_duration),
      box-shadow var(--_duration);
  }

  .control:hover:not(:disabled) {
    border-color: var(--_text-muted);
  }

  :host([invalid]) .control {
    border-color: var(--_danger);
  }

  .control:disabled,
  :host([disabled]) .control {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
