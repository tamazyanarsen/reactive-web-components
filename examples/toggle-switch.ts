/**
 * Переключатель: булев проп, доступность и три способа поменять значение снаружи.
 *
 * Значение можно задать атрибутом (<x-switch checked="true">), записать прямо в сигнал
 * пропса или связать с сигналом родителя. Обратно — только событием change.
 *
 * Отражать проп назад в атрибут (toggleAttribute("checked", ...)) намеренно не стали:
 * атрибут наблюдаемый, запись вызвала бы attributeChangedCallback, тот записал бы
 * в проп разобранное значение — и компонент качался бы сам с собой.
 *
 * Демонстрация заодно показывает контекст: тему объявляет родитель, а читает её
 * компонент через два теневых корня вниз — без единого проброшенного пропса.
 */
import {
  defineComponent,
  payload,
  useCustomComponent,
} from "../src/shared/components/custom/custom-element";
import { button, cls, computed, createContext, css, div, span } from "../src/shared/components/html";
import { signal } from "../src/shared/signals";
import { BASE_CSS, type Example } from "./shared";

const CSS = css`
  :host { display: inline-block; }
  .switch {
    display: inline-flex; align-items: center; gap: 10px;
    background: none; border: 0; padding: 4px; border-radius: 8px;
  }
  .switch:hover:not(:disabled) .track { border-color: var(--accent); }
  .track {
    position: relative; width: 44px; height: 24px; flex: none;
    background: var(--surface); border: 1px solid var(--border); border-radius: 999px;
    transition: background .18s, border-color .18s;
  }
  .thumb {
    position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%;
    background: var(--muted); transition: transform .18s, background .18s;
  }
  .switch.on .track { background: color-mix(in srgb, var(--ok) 25%, transparent); border-color: var(--ok); }
  .switch.on .thumb { background: var(--ok); transform: translateX(20px); }
  .text { font: inherit; }
`;

export class ToggleSwitch extends defineComponent({
  props: { checked: false, disabled: false, label: "" },
  events: { change: payload<boolean>() },
  styles: [BASE_CSS, CSS],
}) {
  render() {
    const { checked, disabled, label } = this.props;

    const toggle = () => {
      const next = !checked();
      checked.set(next);
      this.events.change(next);
    };

    // Настоящая <button>, а не div: клавиатура, фокус и роль достаются бесплатно,
    // остаётся только объявить role="switch" и держать aria-checked в актуальном виде.
    return button(
      {
        class: ["switch", { on: checked }],
        ".disabled": disabled,
        attrs: { role: "switch", "aria-checked": checked },
        "@click": toggle,
      },
      span(cls`track`, span(cls`thumb`)),
      span(cls`text`, label),
    );
  }
}

export const toggleSwitch = useCustomComponent(ToggleSwitch, "x-switch");

// --- контекст темы ----------------------------------------------------------------

export type Theme = "dark" | "light";

/**
 * Ключ несёт тип значения, поэтому provide и inject согласованы компилятором.
 * Значение по умолчанию избавляет потребителя от разбора случая «провайдера нет».
 */
export const ThemeKey = createContext<Theme>("theme", "dark");

const PREVIEW_CSS = css`
  :host { display: block; margin-top: 14px; }
  .preview {
    padding: 16px; border-radius: 8px;
    border: 1px solid var(--border); background: var(--surface);
    transition: background .2s, color .2s, border-color .2s;
  }
  .preview.light { background: #f4f6fa; color: #16181d; border-color: #d6dae2; }
  .preview.compact { padding: 8px; }
  .preview .title { font-weight: 600; }
`;

/** Тему не получает пропсом — берёт из контекста и обновляется вместе с провайдером. */
class ThemePreview extends defineComponent({
  props: { compact: false, note: "" },
  styles: [BASE_CSS, PREVIEW_CSS],
}) {
  render() {
    const theme = this.inject(ThemeKey);

    return div(
      { class: ["preview", { light: () => theme() === "light", compact: this.props.compact }] },
      div(cls`title`, "предпросмотр"),
      div(this.props.note),
      div(cls`muted`, () => `тема из контекста: ${theme()}`),
    );
  }
}

const themePreview = useCustomComponent(ThemePreview, "theme-preview");

// --- демонстрация ---------------------------------------------------------------

const lightTheme = signal(false);
const compact = signal(false);

class SwitchDemo extends defineComponent({ props: {}, styles: [BASE_CSS] }) {
  render() {
    // Провайдер отдаёт источник, а не готовое значение: тогда переключение доходит
    // до всех потребителей само, без пересборки разметки.
    this.provide(ThemeKey, computed<Theme>(() => (lightTheme() ? "light" : "dark")));

    // Ссылку на хост держим, чтобы показать два пути записи снаружи: атрибутом
    // (значение приходит строкой и проходит через parseValue) и прямо в сигнал пропса.
    // Проп связывать с чужим сигналом здесь намеренно не стали: тогда запись снаружи
    // спорила бы с эффектом родителя. Источник правды — сам компонент, его и читаем.
    const notificationsSwitch = toggleSwitch({ ".label": "уведомления", ".checked": true });
    const notifications = notificationsSwitch.props.checked;

    return div(
      {},
      div(
        cls`row`,
        toggleSwitch({
          ".label": "светлая тема",
          ".checked": lightTheme,
          "@change": (event) => lightTheme.set(event.detail),
        }),
        toggleSwitch({
          ".label": "компактно",
          ".checked": compact,
          "@change": (event) => compact.set(event.detail),
        }),
        toggleSwitch({ ".label": "заблокирован", ".checked": true, ".disabled": true }),
      ),
      div(cls`row`, notificationsSwitch),
      div(
        cls`row`,
        button(
          {
            // Атрибут — строка: "true" разберётся в булево, потому что это валидный JSON.
            "@click": () => notificationsSwitch.setAttribute("checked", "true"),
          },
          'setAttribute("checked", "true")',
        ),
        button(
          { "@click": () => notificationsSwitch.props.checked.set(false) },
          "props.checked.set(false)",
        ),
        button(
          { "@click": () => notificationsSwitch.removeAttribute("checked") },
          "removeAttribute — откат к значению из конфига",
        ),
      ),
      themePreview({
        ".compact": compact,
        // Проп компонента — не то же, что атрибут или ребёнок: там значение вполне
        // может быть функцией, поэтому реактивный источник обязан быть сигналом.
        ".note": computed(() =>
          notifications() ? "уведомления включены" : "уведомления выключены",
        ),
      }),
    );
  }
}

const switchDemo = useCustomComponent(SwitchDemo, "switch-demo");

export const example: Example = {
  title: "ToggleSwitch — булев проп, доступность и контекст",
  file: "examples/toggle-switch.ts",
  hint:
    'Внутри обычная <button role="switch"> с реактивным aria-checked. Значение можно ' +
    "задать атрибутом, пропом или связанным сигналом. Тему предпросмотр берёт не пропсом, " +
    "а из контекста — через границу теневого корня.",
  mount: switchDemo,
};
