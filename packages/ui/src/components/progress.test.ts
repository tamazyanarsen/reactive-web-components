import { describe, expect, test } from "bun:test";
import { mount, registerFresh, shadow } from "../test-utils";
import { registerProgress, rwcProgress, type Progress } from "./progress";

registerFresh(registerProgress);

const bar = (element: Progress) => shadow(element).querySelector('[role="progressbar"]') as HTMLElement;

describe("rwc-progress", () => {
  test("определённый прогресс: aria-valuenow/min/max и ширина полосы", () => {
    const element = mount(rwcProgress({ ".value": 40, ".label": "Загрузка" }));
    expect(bar(element).getAttribute("aria-valuenow")).toBe("40");
    expect(bar(element).getAttribute("aria-valuemin")).toBe("0");
    expect(bar(element).getAttribute("aria-valuemax")).toBe("100");
    expect(bar(element).getAttribute("aria-label")).toBe("Загрузка");
    expect((shadow(element).querySelector(".bar") as HTMLElement).style.width).toBe("40%");
  });

  test("по умолчанию прогресс неопределённый: без aria-valuenow", () => {
    const element = mount(rwcProgress());
    expect(bar(element).hasAttribute("aria-valuenow")).toBe(false);
    expect(bar(element).classList.contains("indeterminate")).toBe(true);
    expect(bar(element).hasAttribute("aria-label")).toBe(false);
  });

  test("value=-1 в атрибуте — тоже неопределённый, число — определённый", () => {
    const element = mount(rwcProgress());
    element.setAttribute("value", "-1");
    expect(bar(element).hasAttribute("aria-valuenow")).toBe(false);

    element.setAttribute("value", "25");
    expect(element.value).toBe(25);
    expect(bar(element).getAttribute("aria-valuenow")).toBe("25");
    expect(bar(element).classList.contains("indeterminate")).toBe(false);
  });

  test("значение зажимается в max, max меняет шкалу", () => {
    const element = mount(rwcProgress({ ".value": 30, ".max": 20 }));
    expect(bar(element).getAttribute("aria-valuemax")).toBe("20");
    expect(bar(element).getAttribute("aria-valuenow")).toBe("20");
    expect((shadow(element).querySelector(".bar") as HTMLElement).style.width).toBe("100%");
  });

  test("вариант отражается в атрибут", () => {
    const element = mount(rwcProgress({ ".variant": "danger", ".value": 10 }));
    expect(element.getAttribute("variant")).toBe("danger");
  });
});
