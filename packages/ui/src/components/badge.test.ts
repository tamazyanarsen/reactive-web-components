import { describe, expect, test } from "bun:test";
import { mount, registerFresh, shadow } from "../test-utils";
import { registerBadge, rwcBadge } from "./badge";

registerFresh(registerBadge);

describe("rwc-badge", () => {
  test("рендерит слот, по умолчанию neutral и md", () => {
    const element = mount(rwcBadge("Новый"));
    expect(element.textContent).toBe("Новый");
    expect(shadow(element).querySelector(".badge slot")).not.toBeNull();
    expect(element.getAttribute("variant")).toBe("neutral");
    expect(element.getAttribute("size")).toBe("md");
  });

  test("отражает вариант и размер", () => {
    const element = mount(rwcBadge({ ".variant": "danger", ".size": "sm" }, "Ошибка"));
    expect(element.getAttribute("variant")).toBe("danger");
    expect(element.getAttribute("size")).toBe("sm");

    element.variant = "success";
    expect(element.getAttribute("variant")).toBe("success");
  });
});
