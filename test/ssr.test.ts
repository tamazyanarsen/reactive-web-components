import { describe, expect, test } from "bun:test";
import {
  defineComponent,
  useCustomComponent,
  type CustomTagName,
} from "../src/shared/components/custom/custom-element";
import { each, when } from "../src/shared/components/html/flow";
import { div, input, li, span, ul } from "../src/shared/components/html/html-fabric";
import { css } from "../src/shared/components/utils/styles";
import { renderToString } from "../src/shared/ssr/render-to-string";
import { signal } from "../src/shared/signals";

let tagCounter = 0;
const nextTag = (name: string) => `x-ssr-${name}-${tagCounter++}` as CustomTagName;

describe("renderToString", () => {
  test("обычная разметка сериализуется с экранированием", () => {
    const html = renderToString(() =>
      div({ attrs: { "data-note": 'a "quoted" & <b>' } }, "1 < 2 & 3 > 2"),
    );
    expect(html).toBe('<div data-note="a &quot;quoted&quot; &amp; <b>">1 &lt; 2 &amp; 3 &gt; 2</div>');
  });

  test("компонент уходит в HTML с декларативным теневым корнем и стилями", () => {
    class Card extends defineComponent({
      props: { title: "" },
      styles: css`:host { display: block }`,
    }) {
      render() {
        return div({ class: "card" }, this.props.title);
      }
    }
    const tag = nextTag("card");
    const card = useCustomComponent(Card, tag);

    const html = renderToString(() => card({ ".title": "Отчёт" }));
    expect(html).toBe(
      `<${tag}><template shadowrootmode="open"><style>:host { display: block }</style>` +
        `<div class="card">Отчёт</div></template></${tag}>`,
    );
  });

  test("reflect попадает в атрибуты — клиент восстановит пропсы из них", () => {
    class Badge extends defineComponent({ props: { tone: "info", count: 0 }, reflect: ["tone", "count"] }) {
      render() {
        return span(this.props.tone);
      }
    }
    const tag = nextTag("badge");
    const badge = useCustomComponent(Badge, tag);

    const html = renderToString(() => badge({ ".tone": "danger", ".count": 3 }));
    expect(html).toStartWith(`<${tag} tone="danger" count="3">`);
  });

  test("светлый DOM компонента сохраняется рядом с теневым корнем", () => {
    class Box extends defineComponent({ props: {} }) {
      render() {
        return div("рамка");
      }
    }
    const tag = nextTag("box");
    const box = useCustomComponent(Box, tag);

    const html = renderToString(() => box(span("внутри")));
    expect(html).toBe(
      `<${tag}><template shadowrootmode="open"><div>рамка</div></template><span>внутри</span></${tag}>`,
    );
  });

  test("блоки рендерятся без якорей, с якорями — по запросу", () => {
    const items = signal(["a", "b"]);
    const build = () => ul(each(items, (item) => li(item)), when(() => true, () => li("хвост")));

    expect(renderToString(build)).toBe("<ul><li>a</li><li>b</li><li>хвост</li></ul>");
    expect(renderToString(build, { comments: true })).toContain("<!--each-->");
  });

  test("значение поля из свойства попадает в атрибут", () => {
    const html = renderToString(() => input({ ".value": "текст" }));
    expect(html).toBe('<input value="текст">');
  });

  test("после рендера эффекты уничтожены", () => {
    const text = signal("раз");
    let runs = 0;
    renderToString(() =>
      span(() => {
        runs++;
        return text();
      }),
    );
    text.set("два");
    expect(runs).toBe(1);
  });
});
