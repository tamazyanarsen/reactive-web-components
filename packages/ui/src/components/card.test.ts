import { describe, expect, test } from "bun:test";
import { div, p } from "@rwcjs/core";
import { mount, registerFresh, shadow } from "../test-utils";
import { registerCard, rwcCard, type Card } from "./card";

registerFresh(registerCard);

const part = (element: Card, name: string) => shadow(element).querySelector<HTMLElement>(`[part=${name}]`)!;

describe("rwc-card", () => {
  test("отражает вариант и рендерит три слота", () => {
    const element = mount(rwcCard({ ".variant": "elevated" }, p("Тело")));
    expect(element.getAttribute("variant")).toBe("elevated");
    expect(shadow(element).querySelectorAll("slot")).toHaveLength(3);
    expect(shadow(element).querySelector("slot[name=header]")).not.toBeNull();
    expect(shadow(element).querySelector("slot[name=footer]")).not.toBeNull();
  });

  test("вариант по умолчанию — outlined", () => {
    expect(mount(rwcCard()).getAttribute("variant")).toBe("outlined");
  });

  test("пустые шапка и подвал скрыты", () => {
    const element = mount(rwcCard({}, p("Тело")));
    expect(part(element, "header").hidden).toBe(true);
    expect(part(element, "footer").hidden).toBe(true);
    expect(part(element, "body").hidden).toBe(false);
  });

  test("шапка и подвал появляются вместе с содержимым и прячутся без него", () => {
    const element = mount(rwcCard({}, div({ attrs: { slot: "header" } }, "Заголовок"), p("Тело")));
    expect(part(element, "header").hidden).toBe(false);
    expect(part(element, "footer").hidden).toBe(true);

    const footer = div({ attrs: { slot: "footer" } }, "Подвал");
    element.append(footer);
    expect(part(element, "footer").hidden).toBe(false);

    footer.remove();
    expect(part(element, "footer").hidden).toBe(true);
  });
});
