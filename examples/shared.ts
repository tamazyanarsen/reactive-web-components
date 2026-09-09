/**
 * Общее для примеров: базовые стили компонентов и описание карточки галереи.
 *
 * CSS страницы внутрь shadow root не проникает, поэтому стили каждый компонент возит
 * с собой — через `styles` в объявлении (то же самое можно написать как `static styles`).
 * Строка разбирается один раз на всю страницу, экземпляры делят общий CSSStyleSheet.
 *
 * А вот CSS-переменные границу shadow root пересекают — на них и держится тема:
 * страница задаёт --rwc-*, компонент читает их с фолбэком и потому остаётся рабочим
 * даже без страницы-галереи.
 */
import { css } from "../src/shared/components/html";

export const BASE_CSS = css`
  :host {
    display: block;
    --accent: var(--rwc-accent, #6ea8fe);
    --ok: var(--rwc-ok, #6ee7a8);
    --warn: var(--rwc-warn, #ffd479);
    --err: var(--rwc-err, #ff8b8b);
    --text: var(--rwc-text, #e6e8ec);
    --muted: var(--rwc-muted, #8b93a1);
    --surface: var(--rwc-surface, #23262d);
    --raised: var(--rwc-raised, #2a2f38);
    --border: var(--rwc-border, #2f343d);
    color: var(--text);
  }
  * { box-sizing: border-box; }

  button {
    background: var(--raised); color: inherit; border: 1px solid var(--border);
    border-radius: 6px; padding: 7px 14px; font: inherit; cursor: pointer;
    transition: border-color .15s, opacity .15s;
  }
  button:hover:not(:disabled) { border-color: var(--accent); }
  button:disabled { opacity: .45; cursor: not-allowed; }

  input {
    background: var(--surface); color: inherit; border: 1px solid var(--border);
    border-radius: 6px; padding: 7px 10px; font: inherit;
  }
  input:focus-visible { outline: none; border-color: var(--accent); }

  .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .row + .row { margin-top: 12px; }
  .muted { color: var(--muted); }
  .mono { font-family: ui-monospace, SFMono-Regular, monospace; color: var(--accent); }
  .label { font-weight: 600; }
  .note {
    color: var(--muted); padding: 12px 14px; text-align: center;
    border: 1px dashed var(--border); border-radius: 8px;
  }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 14px; }
`;

export type Example = {
  title: string;
  /** Файл примера — галерея показывает его как подпись к секции. */
  file: string;
  hint: string;
  /**
   * Демонстрация — тоже веб-компонент, а не просто узел: всё реактивное в ней
   * должно создаваться внутри render(), иначе эффекты останутся без владельца.
   */
  mount: () => HTMLElement;
};
