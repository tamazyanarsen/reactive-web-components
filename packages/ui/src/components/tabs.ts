import {
  computed,
  configCustomComponent,
  css,
  type CustomTagName,
  defineComponent,
  div,
  effect,
  payload,
  signal,
  slot,
  type RegisterOptions,
} from "@rwcjs/core";
import { tokens } from "../tokens";

export type TabsActivation = "auto" | "manual";
export type TabsOrientation = "horizontal" | "vertical";

let idCounter = 0;

/**
 * id нужен для aria-controls/aria-labelledby; свой id, заданный автором, не трогаем.
 * Префикс — имя тега: у двух версий кита на странице теги разные (rwc-tab и rwc-tab-v2),
 * а счётчики у каждой копии свои и начинаются с нуля — без префикса id совпали бы.
 */
const ensureId = (element: HTMLElement) => {
  if (!element.id) element.id = `${element.localName}-${++idCounter}`;
  return element.id;
};

const sameItems = <T>(a: readonly T[], b: readonly T[]) =>
  a.length === b.length && a.every((item, index) => item === b[index]);

/**
 * Вкладка: <rwc-tab value="general">Общее</rwc-tab>. Живёт только внутри rwc-tabs.
 *
 * role="tab" и tabindex стоят на самом хосте, а не на кнопке в теневом корне: вкладка и
 * панель — соседи в light DOM, поэтому aria-controls/aria-labelledby связывают их по id
 * без пересечения теневых границ. По той же причине нет delegatesFocus — фокус и есть хост.
 */
export class Tab extends defineComponent({
  props: {
    /** Идентификатор вкладки; панель с тем же value показывается, когда вкладка выбрана. */
    value: "",
    /** Отключает вкладку: её нельзя выбрать, стрелки её пропускают. */
    disabled: false,
    /** Вкладка выбрана. Ставит rwc-tabs, вручную не меняется. */
    selected: false,
  },
  reflect: ["disabled", "selected"],
  styles: [
    tokens,
    css`
      :host {
        display: inline-flex;
        align-items: center;
        gap: var(--_space);
        min-height: var(--_control-height);
        padding: 0 calc(var(--_space) * 1.5);
        border-radius: var(--_radius-sm);
        color: var(--_text-muted);
        font-weight: 500;
        white-space: nowrap;
        cursor: pointer;
        user-select: none;
        outline: none;
        transition:
          color var(--_duration),
          background var(--_duration),
          box-shadow var(--_duration);
      }
      :host(:hover) {
        color: var(--_text);
      }
      :host([selected]) {
        color: var(--_text);
        background: var(--_surface);
        box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);
      }
      :host(:focus-visible) {
        box-shadow: var(--_focus-ring);
      }
      :host([disabled]) {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ],
}) {
  override connectedCallback() {
    // Вкладка сама уходит в слот шапки rwc-tabs — писать slot="tab" руками не нужно.
    if (!this.hasAttribute("slot")) this.slot = "tab";
    if (!this.hasAttribute("role")) this.setAttribute("role", "tab");
    ensureId(this);
    super.connectedCallback();
  }

  render() {
    const { selected, disabled } = this.props;
    effect(() => this.setAttribute("aria-selected", String(selected())));
    effect(() => {
      if (disabled()) this.setAttribute("aria-disabled", "true");
      else this.removeAttribute("aria-disabled");
    });
    return slot();
  }
}

/** Панель вкладки: <rwc-tab-panel value="general">...</rwc-tab-panel>. Скрыта, пока её вкладка не выбрана. */
export class TabPanel extends defineComponent({
  props: {
    /** Идентификатор панели — value её вкладки. */
    value: "",
  },
  styles: [
    tokens,
    css`
      :host {
        display: block;
        padding: calc(var(--_space) * 2) 0;
        border-radius: var(--_radius-sm);
        outline: none;
      }
      :host(:focus-visible) {
        box-shadow: var(--_focus-ring);
      }
    `,
  ],
}) {
  override connectedCallback() {
    if (!this.hasAttribute("role")) this.setAttribute("role", "tabpanel");
    // По APG панель фокусируема: Tab из списка вкладок ведёт в её содержимое.
    if (!this.hasAttribute("tabindex")) this.tabIndex = 0;
    ensureId(this);
    super.connectedCallback();
  }

  render() {
    return slot();
  }
}

/** Вкладка или панель без value опознаётся по своей позиции среди соседей того же рода. */
const keyOf = (item: Tab | TabPanel, index: number) => item.props.value() || String(index);

/**
 * Вкладки по WAI-ARIA APG:
 *
 *   rwcTabs({ ".value": "general", "@tabChange": (e) => e.detail },
 *     rwcTab({ ".value": "general" }, "Общее"),
 *     rwcTab({ ".value": "access" }, "Доступ"),
 *     rwcTabPanel({ ".value": "general" }, ...),
 *     rwcTabPanel({ ".value": "access" }, ...),
 *   )
 *
 * Вкладки и панели — дети в light DOM: rwc-tab сам садится в слот "tab" (шапка с
 * role="tablist"), панели и прочее — в слот по умолчанию. rwc-tabs только раздаёт
 * состояние: selected и roving tabindex вкладкам, hidden и связки id панелям.
 * Стрелки (+ Home/End) двигают фокус, при activation="auto" фокус сразу выбирает вкладку,
 * при "manual" — только Enter/Space.
 */
export class Tabs extends defineComponent({
  props: {
    /** value выбранной вкладки; пусто или не найдено — выбрана первая доступная. */
    value: "",
    /** auto — вкладка выбирается при фокусе стрелками, manual — только по Enter/Space. */
    activation: "auto" as TabsActivation,
    /** Направление списка вкладок; от него зависят стрелки и aria-orientation. */
    orientation: "horizontal" as TabsOrientation,
  },
  events: {
    /**
     * Пользователь выбрал другую вкладку; payload — её value. Не change: нативные change
     * от полей внутри панелей всплывают сквозь rwc-tabs и смешались бы с этим событием.
     */
    tabChange: payload<string>(),
  },
  reflect: ["orientation"],
  styles: [
    tokens,
    css`
      :host {
        display: block;
      }
      :host([orientation="vertical"]) {
        display: flex;
        gap: calc(var(--_space) * 2);
      }

      [role="tablist"] {
        display: inline-flex;
        align-items: center;
        gap: calc(var(--_space) / 2);
        padding: calc(var(--_space) / 2);
        border-radius: var(--_radius);
        background: var(--_surface-muted);
      }
      :host([orientation="vertical"]) [role="tablist"] {
        flex-direction: column;
        align-items: stretch;
        align-self: flex-start;
      }

      .panels {
        min-width: 0;
        flex: 1;
      }
    `,
  ],
}) {
  /** Вкладки и панели в порядке документа — из слотов, обновляются на slotchange. */
  private readonly tabItems = signal<Tab[]>([], { equals: sameItems });
  private readonly panelItems = signal<TabPanel[]>([], { equals: sameItems });
  private syncSlots = () => {};

  constructor() {
    super();
    // Слушатели на хосте, а не в теневом корне: клавиши и клики приходят от вкладок
    // из light DOM, и хост — их общий предок. Вешаются один раз на весь век элемента.
    this.addEventListener("click", (event) => {
      const tab = this.tabFromEvent(event);
      if (tab && !tab.props.disabled.peek()) this.select(tab);
    });
    this.addEventListener("keydown", (event) => this.onKeydown(event));
  }

  override connectedCallback() {
    super.connectedCallback();
    // slotchange не обязан прийти для детей, которые уже лежали в хосте до рендера.
    this.syncSlots();
  }

  /** Вкладка, которой адресовано событие: цель может быть вложенным в неё элементом. */
  private tabFromEvent(event: Event) {
    const tabs = this.tabItems.peek();
    return event.composedPath().find((target): target is Tab => tabs.includes(target as Tab));
  }

  private select(tab: Tab) {
    const key = keyOf(tab, this.tabItems.peek().indexOf(tab));
    if (tab.props.selected.peek()) return;
    this.props.value.set(key);
    this.events.tabChange(key);
  }

  private onKeydown(event: KeyboardEvent) {
    const tab = this.tabFromEvent(event);
    if (!tab) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!tab.props.disabled.peek()) this.select(tab);
      return;
    }

    const vertical = this.props.orientation.peek() === "vertical";
    const prevKey = vertical ? "ArrowUp" : "ArrowLeft";
    const nextKey = vertical ? "ArrowDown" : "ArrowRight";
    const enabled = this.tabItems.peek().filter((item) => !item.props.disabled.peek());
    if (!enabled.length) return;

    // Фокус может стоять на отключённой вкладке (её выбрали до отключения) — тогда
    // считаем от ближайшей доступной позиции.
    const index = enabled.indexOf(tab);
    let target: Tab | undefined;
    if (event.key === nextKey) target = enabled[(index + 1) % enabled.length];
    else if (event.key === prevKey) target = enabled[(index - 1 + enabled.length) % enabled.length];
    else if (event.key === "Home") target = enabled[0];
    else if (event.key === "End") target = enabled[enabled.length - 1];
    if (!target) return;

    event.preventDefault();
    target.focus();
    if (this.props.activation.peek() === "auto") this.select(target);
  }

  render() {
    const { value, orientation } = this.props;

    const tabSlot = slot({ ".name": "tab", "@slotchange": () => this.syncSlots() });
    const panelSlot = slot({ "@slotchange": () => this.syncSlots() });

    this.syncSlots = () => {
      this.tabItems.set(tabSlot.assignedElements().filter((el): el is Tab => el instanceof Tab));
      this.panelItems.set(
        panelSlot.assignedElements().filter((el): el is TabPanel => el instanceof TabPanel),
      );
    };

    const selectedTab = computed(() => {
      const tabs = this.tabItems();
      const current = value();
      const enabled = tabs.filter((tab) => !tab.props.disabled());
      return enabled.find((tab) => keyOf(tab, tabs.indexOf(tab)) === current) ?? enabled[0];
    });

    // Вся раздача состояния в одном эффекте: он зависит от списков, выбора и value
    // каждой вкладки и панели, так что переименование value тоже пересвязывает пары.
    effect(() => {
      const tabs = this.tabItems();
      const panels = this.panelItems();
      const active = selectedTab();
      // Если доступных нет, в список всё равно должен вести Tab — пусть ведёт на первую.
      const focusable = active ?? tabs[0];
      const tabKeys = tabs.map(keyOf);
      const panelKeys = panels.map(keyOf);

      tabs.forEach((tab, index) => {
        tab.props.selected.set(tab === active);
        tab.tabIndex = tab === focusable ? 0 : -1;
        const panel = panels[panelKeys.indexOf(tabKeys[index]!)];
        if (panel) tab.setAttribute("aria-controls", panel.id);
        else tab.removeAttribute("aria-controls");
      });

      panels.forEach((panel, index) => {
        const tab = tabs[tabKeys.indexOf(panelKeys[index]!)];
        panel.hidden = !tab || tab !== active;
        if (tab) panel.setAttribute("aria-labelledby", tab.id);
        else panel.removeAttribute("aria-labelledby");
      });
    });

    return [
      div(
        {
          attrs: {
            role: "tablist",
            part: "tablist",
            "aria-orientation": orientation,
          },
        },
        tabSlot,
      ),
      div({ class: "panels", attrs: { part: "panels" } }, panelSlot),
    ];
  }
}

const [tabFactory, registerTab] = configCustomComponent(Tab, "rwc-tab");
const [tabPanelFactory, registerTabPanel] = configCustomComponent(TabPanel, "rwc-tab-panel");
const [tabsFactory, registerTabsOnly] = configCustomComponent(Tabs, "rwc-tabs");

export const rwcTab = tabFactory;
export const rwcTabPanel = tabPanelFactory;
export const rwcTabs = tabsFactory;

/**
 * Регистрирует rwc-tabs вместе с rwc-tab и rwc-tab-panel под одним постфиксом —
 * по отдельности они не работают. Вкладка и панель регистрируются первыми, чтобы
 * к первому рендеру rwc-tabs его дети уже были апгрейднуты. Возвращает тег rwc-tabs.
 */
export const registerTabs = (options?: RegisterOptions): CustomTagName => {
  registerTab(options);
  registerTabPanel(options);
  return registerTabsOnly(options);
};
