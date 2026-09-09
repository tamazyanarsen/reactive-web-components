/**
 * Вкладки: слот с контекстом, dynamic для панели и нативный слот в шапке.
 *
 * Содержимое панели рисует не компонент, а тот, кто его использует. Компонент
 * объявляет слот panel и тип его контекста, вызывающий передаёт шаблон ключом
 * "#panel" — контекст в шаблоне типизирован, а если шаблона нет, рендерится
 * запасное содержимое из третьего аргумента renderSlot.
 *
 * Рядом работает и нативный <slot>: кнопки шапки приезжают из light DOM хоста.
 * Разница простая — нативный слот переносит готовые узлы, слот с контекстом
 * отдаёт вызывающему данные и просит разметку.
 */
import {
  defineComponent,
  payload,
  useCustomComponent,
} from "../src/shared/components/custom/custom-element";
import {
  button,
  cls,
  code,
  computed,
  css,
  div,
  dynamic,
  each,
  li,
  p,
  slot,
  span,
  strong,
  ul,
} from "../src/shared/components/html";
import { signal } from "../src/shared/signals";
import { BASE_CSS, type Example } from "./shared";

const CSS = css`
  .strip {
    display: flex; align-items: center; gap: 6px;
    border-bottom: 1px solid var(--border); padding-bottom: 8px;
  }
  .tab {
    background: none; border: 1px solid transparent; border-radius: 6px 6px 0 0;
    color: var(--muted); padding: 7px 14px;
  }
  .tab:hover:not(.active) { color: var(--text); border-color: transparent; }
  .tab.active { color: var(--accent); border-color: var(--border); border-bottom-color: transparent; background: var(--surface); }
  .actions { margin-left: auto; display: flex; gap: 6px; }
  .panel { padding: 14px 2px; min-height: 64px; }
`;

export type Tab = { id: string; title: string };

export class Tabs extends defineComponent({
  props: { tabs: [] as Tab[], active: "" },
  events: { tabChange: payload<string>() },
  /**
   * Контекст слота — обычное значение, а не сигнал: панель и так пересобирается
   * через dynamic при каждой смене вкладки, держать здесь источник незачем.
   * Сигналы в контексте нужны там, где узлы переиспользуются, — см. each.
   */
  slots: { panel: payload<{ tab: Tab }>() },
  styles: [BASE_CSS, CSS],
}) {
  render() {
    const { active } = this.props;
    // tabs не разбираем в переменную: так имя не спорит с фабрикой tabs() ниже.
    const items = this.props.tabs;

    /** Если active не указан или указывает в никуда — показываем первую вкладку. */
    const current = computed(() => items().find((tab) => tab.id === active()) ?? items()[0]);

    const select = (id: string) => {
      if (id === active()) return;
      active.set(id);
      this.events.tabChange(id);
    };

    return [
      div(
        { class: "strip", attrs: { role: "tablist" } },
        each(
          items,
          (tab) =>
            button(
              {
                class: ["tab", { active: () => current()?.id === tab().id }],
                attrs: {
                  role: "tab",
                  "aria-selected": () => current()?.id === tab().id,
                },
                "@click": () => select(tab().id),
              },
              () => tab().title,
            ),
          (tab) => tab.id,
        ),
        // Нативный слот: дополнительные кнопки шапки приезжают из light DOM хоста.
        div(cls`actions`, slot({ ".name": "actions" })),
      ),
      div(
        { class: "panel", attrs: { role: "tabpanel" } },
        // dynamic пересобирает панель при смене вкладки. Сигналы, прочитанные внутри
        // шаблона вызывающим, тоже становятся зависимостями этого узла — поэтому
        // переключение вида панели в демонстрации работает без лишних пропсов.
        dynamic(() => {
          const tab = current();
          return tab
            ? this.renderSlot("panel", { tab }, () => span(tab.title))
            : div(cls`note`, "вкладок нет");
        }),
      ),
    ];
  }
}

export const tabs = useCustomComponent(Tabs, "x-tabs");

// --- демонстрация ---------------------------------------------------------------

const DEMO_CSS = css`
  .body { display: grid; gap: 8px; }
  .body ul { margin: 0; padding-left: 20px; display: grid; gap: 4px; }
  .status { margin-top: 12px; color: var(--muted); }
`;

const TAB_LIST: Tab[] = [
  { id: "signals", title: "Сигналы" },
  { id: "flow", title: "Поток" },
  { id: "components", title: "Компоненты" },
];

const PANELS: Record<string, string[]> = {
  signals: ["signal — значение и подписчики", "computed — производное значение", "batch — одна запись на пачку"],
  flow: ["when — ветка по условию", "each — список по ключу", "dynamic — узел, зависящий от сигналов"],
  components: ["defineComponent — пропсы, события и слоты", "useCustomComponent — регистрация тега", "provide/inject — контекст поддерева"],
};

const tabList = signal<Tab[]>(TAB_LIST);
const activeTab = signal("flow");
const compactPanels = signal(false);
let extraTabs = 0;

class TabsDemo extends defineComponent({ props: {}, styles: [BASE_CSS, DEMO_CSS] }) {
  render() {
    return div(
      {},
      tabs(
        {
          ".tabs": tabList,
          ".active": activeTab,
          "@tabChange": (event) => activeTab.set(event.detail),
          // Шаблон панели: tab приходит из объявления компонента и типизирован.
          // compactPanels читается здесь же — значит панель пересоберётся и при
          // смене вида, а не только при смене вкладки.
          "#panel": ({ tab }) =>
            compactPanels()
              ? p(cls`muted`, `${tab.title}: ${(PANELS[tab.id] ?? []).length} пунктов`)
              : div(
                  cls`body`,
                  strong(tab.title),
                  ul(...(PANELS[tab.id] ?? ["содержимого нет"]).map((item) => li(code(item)))),
                ),
        },
        // Ребёнок с .slot едет в именованный слот шапки — он в light DOM хоста.
        button(
          {
            ".slot": "actions",
            "@click": () => {
              extraTabs += 1;
              tabList.update((list) => [...list, { id: `extra-${extraTabs}`, title: `Ещё ${extraTabs}` }]);
            },
          },
          "+ вкладка",
        ),
      ),
      div(
        cls`row`,
        button(
          { "@click": () => compactPanels.update((value) => !value) },
          () => (compactPanels() ? "подробные панели" : "компактные панели"),
        ),
        button(
          {
            ".disabled": () => tabList().length <= TAB_LIST.length,
            "@click": () => tabList.set(TAB_LIST),
          },
          "вернуть три вкладки",
        ),
      ),
      div(cls`status`, "активная вкладка: ", span(cls`mono`, activeTab)),
    );
  }
}

const tabsDemo = useCustomComponent(TabsDemo, "tabs-demo");

export const example: Example = {
  title: "Tabs — слот с контекстом, dynamic и нативный слот",
  file: "examples/tabs.ts",
  hint:
    "Панель рисует шаблон вызывающего: компонент объявляет слот и тип его контекста, " +
    'родитель передаёт разметку ключом "#panel". Кнопка «+ вкладка» приезжает в ' +
    "нативный именованный слот шапки.",
  mount: tabsDemo,
};
