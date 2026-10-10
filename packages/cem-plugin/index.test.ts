import { describe, expect, test } from "bun:test";
// @ts-expect-error: index.js анализатора экспортирует create и ts, а его index.d.ts — нет.
import { create, ts } from "@custom-elements-manifest/analyzer";
import { rwcPlugin } from "./index.js";

const analyze = (code: string) => {
  const source = ts.createSourceFile("src/button.ts", code, ts.ScriptTarget.ESNext, true);
  return create({ modules: [source], plugins: [rwcPlugin()] });
};

const SOURCE = `
import { defineComponent, payload, useCustomComponent, button } from "@rwcjs/core";

type Variant = "primary" | "secondary";

export class Button extends defineComponent({
  props: {
    /** Внешний вид кнопки. */
    variant: "secondary" as Variant,
    disabled: false,
    maxCount: 3,
    title: "",
  },
  events: { valueChange: payload<number>(), ping: payload<void>() },
  reflect: ["variant", "disabled"],
  form: true,
}) {
  render() {
    return button("ok");
  }
}

export const uiButton = useCustomComponent(Button, "ui-button");
`;

describe("rwcPlugin", () => {
  const manifest = analyze(SOURCE);
  const moduleDoc = manifest.modules[0]!;
  const classDoc = moduleDoc.declarations!.find((d: { name: string }) => d.name === "Button") as any;

  test("класс помечен как custom element с тегом из useCustomComponent", () => {
    expect(classDoc.customElement).toBe(true);
    expect(classDoc.tagName).toBe("ui-button");
    expect(moduleDoc.exports).toContainEqual({
      kind: "custom-element-definition",
      name: "ui-button",
      declaration: { name: "Button", module: "src/button.ts" },
    });
  });

  test("пропсы становятся атрибутами в kebab-case с типом и значением по умолчанию", () => {
    const byName = Object.fromEntries(classDoc.attributes.map((a: any) => [a.name, a]));
    expect(byName["variant"]).toMatchObject({
      fieldName: "variant",
      type: { text: "Variant" },
      default: '"secondary"',
      description: "Внешний вид кнопки.",
    });
    expect(byName["max-count"]).toMatchObject({ fieldName: "maxCount", type: { text: "number" } });
    expect(byName["disabled"]).toMatchObject({ type: { text: "boolean" }, default: "false" });
  });

  test("поля отражают reflect и не перекрывают нативные члены", () => {
    const fields = Object.fromEntries(classDoc.members.map((m: any) => [m.name, m]));
    expect(fields["variant"].reflects).toBe(true);
    expect(fields["disabled"].reflects).toBe(true);
    expect(fields["maxCount"].reflects).toBeUndefined();
    expect(fields["title"]).toBeUndefined();
  });

  test("события получают kebab-case и тип payload", () => {
    expect(classDoc.events).toContainEqual({ name: "value-change", type: { text: "CustomEvent<number>" } });
    expect(classDoc.events).toContainEqual({ name: "ping", type: { text: "CustomEvent<void>" } });
  });

  test("form: true помечается в манифесте", () => {
    expect(classDoc.formAssociated).toBe(true);
  });

  test("configCustomComponent тоже даёт тег", () => {
    const result = analyze(`
      import { defineComponent, configCustomComponent } from "@rwcjs/core";
      class Chip extends defineComponent({ props: { label: "" } }) { render() { return null; } }
      export const [chip, registerChip] = configCustomComponent(Chip, "ui-chip");
    `);
    const chip = result.modules[0]!.declarations!.find((d: { name: string }) => d.name === "Chip") as any;
    expect(chip.tagName).toBe("ui-chip");
  });
});
