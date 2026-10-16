import { describe, expect, test } from "bun:test";
import { click, mount, press, registerFresh, shadow } from "../test-utils";
import { registerTabs, rwcTab, rwcTabPanel, rwcTabs, type Tabs } from "./tabs";

registerFresh(registerTabs);

const build = (config: Parameters<typeof rwcTabs>[0] = {}) =>
  mount(
    rwcTabs(
      config,
      rwcTab({ ".value": "a" }, "Первая"),
      rwcTab({ ".value": "b" }, "Вторая"),
      rwcTab({ ".value": "c" }, "Третья"),
      rwcTabPanel({ ".value": "a" }, "Панель A"),
      rwcTabPanel({ ".value": "b" }, "Панель B"),
      rwcTabPanel({ ".value": "c" }, "Панель C"),
    ),
  );

const tabsOf = (element: Tabs) => Array.from(element.querySelectorAll<HTMLElement>("[role=tab]"));
const panelsOf = (element: Tabs) => Array.from(element.querySelectorAll<HTMLElement>("[role=tabpanel]"));
const visiblePanel = (element: Tabs) => panelsOf(element).find((panel) => !panel.hidden);

describe("rwc-tabs", () => {
  test("роли, связки id и выбор первой вкладки по умолчанию", () => {
    const element = build();
    const tabs = tabsOf(element);
    const panels = panelsOf(element);

    expect(shadow(element).querySelector("[role=tablist]")).not.toBeNull();
    expect(tabs).toHaveLength(3);
    expect(tabs.every((tab) => tab.slot === "tab")).toBe(true);

    expect(tabs.map((tab) => tab.getAttribute("aria-selected"))).toEqual(["true", "false", "false"]);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
    expect(tabs[0]!.hasAttribute("selected")).toBe(true);

    // Префикс id — тег с постфиксом: у двух версий кита на странице id не совпадут.
    expect(tabs[0]!.id.startsWith(`${tabs[0]!.localName}-`)).toBe(true);
    expect(panels[0]!.id.startsWith(`${panels[0]!.localName}-`)).toBe(true);

    tabs.forEach((tab, index) => {
      expect(tab.getAttribute("aria-controls")).toBe(panels[index]!.id);
      expect(panels[index]!.getAttribute("aria-labelledby")).toBe(tab.id);
    });
    expect(visiblePanel(element)?.textContent).toBe("Панель A");
  });

  test("value выбирает вкладку и панель", () => {
    const element = build({ ".value": "b" });
    expect(visiblePanel(element)?.textContent).toBe("Панель B");
    expect(tabsOf(element)[1]!.getAttribute("aria-selected")).toBe("true");

    element.value = "c";
    expect(visiblePanel(element)?.textContent).toBe("Панель C");
    expect(tabsOf(element).map((tab) => tab.tabIndex)).toEqual([-1, -1, 0]);
  });

  test("change от поля внутри панели не путается с выбором вкладки", () => {
    const changes: string[] = [];
    const element = build({ "@tabChange": (event) => changes.push(event.detail) });
    const field = document.createElement("input");
    panelsOf(element)[0]!.append(field);
    field.dispatchEvent(new Event("change", { bubbles: true }));
    expect(changes).toEqual([]);
  });

  test("клик выбирает вкладку и шлёт tab-change", () => {
    const changes: string[] = [];
    const element = build({ "@tabChange": (event) => changes.push(event.detail) });

    click(tabsOf(element)[2]!);
    expect(changes).toEqual(["c"]);
    expect(element.value).toBe("c");
    expect(visiblePanel(element)?.textContent).toBe("Панель C");

    // Повторный клик по выбранной — не изменение.
    click(tabsOf(element)[2]!);
    expect(changes).toEqual(["c"]);
  });

  test("стрелки с зацикливанием, Home и End; auto выбирает при фокусе", () => {
    const changes: string[] = [];
    const element = build({ "@tabChange": (event) => changes.push(event.detail) });
    const tabs = tabsOf(element);

    press(tabs[0]!, "ArrowRight");
    expect(document.activeElement).toBe(tabs[1]!);
    expect(element.value).toBe("b");

    press(tabs[1]!, "End");
    expect(document.activeElement).toBe(tabs[2]!);
    press(tabs[2]!, "ArrowRight");
    expect(document.activeElement).toBe(tabs[0]!);
    press(tabs[0]!, "ArrowLeft");
    expect(document.activeElement).toBe(tabs[2]!);
    press(tabs[2]!, "Home");
    expect(document.activeElement).toBe(tabs[0]!);

    expect(changes).toEqual(["b", "c", "a", "c", "a"]);
  });

  test("manual: стрелки только двигают фокус, Enter выбирает", () => {
    const changes: string[] = [];
    const element = build({ ".activation": "manual", "@tabChange": (event) => changes.push(event.detail) });
    const tabs = tabsOf(element);

    press(tabs[0]!, "ArrowRight");
    expect(document.activeElement).toBe(tabs[1]!);
    expect(changes).toEqual([]);
    expect(visiblePanel(element)?.textContent).toBe("Панель A");

    press(tabs[1]!, "Enter");
    expect(changes).toEqual(["b"]);
    expect(visiblePanel(element)?.textContent).toBe("Панель B");

    press(tabs[1]!, "ArrowRight");
    press(tabs[2]!, " ");
    expect(changes).toEqual(["b", "c"]);
  });

  test("vertical: стрелки вверх-вниз и aria-orientation", () => {
    const element = build({ ".orientation": "vertical" });
    const tabs = tabsOf(element);
    expect(shadow(element).querySelector("[role=tablist]")!.getAttribute("aria-orientation")).toBe("vertical");

    press(tabs[0]!, "ArrowRight");
    expect(element.value).toBe("");
    press(tabs[0]!, "ArrowDown");
    expect(element.value).toBe("b");
    press(tabs[1]!, "ArrowUp");
    expect(element.value).toBe("a");
  });

  test("отключённая вкладка не выбирается и пропускается стрелками", () => {
    const element = mount(
      rwcTabs(
        {},
        rwcTab({ ".value": "a" }, "A"),
        rwcTab({ ".value": "b", ".disabled": true }, "B"),
        rwcTab({ ".value": "c" }, "C"),
        rwcTabPanel({ ".value": "a" }, "A"),
        rwcTabPanel({ ".value": "b" }, "B"),
        rwcTabPanel({ ".value": "c" }, "C"),
      ),
    );
    const tabs = tabsOf(element);
    expect(tabs[1]!.getAttribute("aria-disabled")).toBe("true");

    click(tabs[1]!);
    expect(element.value).toBe("");

    press(tabs[0]!, "ArrowRight");
    expect(document.activeElement).toBe(tabs[2]!);
    expect(element.value).toBe("c");
  });

  test("без value вкладки и панели связываются по порядку; добавленная вкладка подхватывается", () => {
    const element = mount(rwcTabs({}, rwcTab("Раз"), rwcTab("Два"), rwcTabPanel("1"), rwcTabPanel("2")));
    click(tabsOf(element)[1]!);
    expect(element.value).toBe("1");
    expect(visiblePanel(element)?.textContent).toBe("2");

    element.append(rwcTab({ ".value": "x" }, "Три"), rwcTabPanel({ ".value": "x" }, "3"));
    const tabs = tabsOf(element);
    expect(tabs).toHaveLength(3);
    click(tabs[2]!);
    expect(visiblePanel(element)?.textContent).toBe("3");
    expect(tabs[2]!.getAttribute("aria-controls")).toBe(panelsOf(element)[2]!.id);
  });
});
