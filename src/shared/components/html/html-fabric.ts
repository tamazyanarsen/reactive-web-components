import { el, type ElementChild, type ElementOptions, type TagName } from "./html-element";

/**
 * Именованная фабрика на тег: div({ ".title": "x" }, "текст", span("вложенный")).
 * Конфиг необязателен — div("текст") тоже работает.
 */
const tagFactory =
  <T extends TagName>(tagName: T) =>
  (
    configOrChild?: ElementOptions<HTMLElementTagNameMap[T]> | ElementChild,
    ...children: ElementChild[]
  ) =>
    el(tagName, configOrChild, ...children);

// Структура
export const div = tagFactory("div");
export const span = tagFactory("span");
export const section = tagFactory("section");
export const article = tagFactory("article");
export const aside = tagFactory("aside");
export const nav = tagFactory("nav");
export const header = tagFactory("header");
export const footer = tagFactory("footer");
export const main = tagFactory("main");
export const slot = tagFactory("slot");
export const address = tagFactory("address");
export const hgroup = tagFactory("hgroup");
export const dialog = tagFactory("dialog");
export const template = tagFactory("template");

// Текст
export const p = tagFactory("p");
export const h1 = tagFactory("h1");
export const h2 = tagFactory("h2");
export const h3 = tagFactory("h3");
export const h4 = tagFactory("h4");
export const h5 = tagFactory("h5");
export const h6 = tagFactory("h6");
export const strong = tagFactory("strong");
export const em = tagFactory("em");
export const b = tagFactory("b");
export const i = tagFactory("i");
export const u = tagFactory("u");
export const s = tagFactory("s");
export const small = tagFactory("small");
export const mark = tagFactory("mark");
export const sub = tagFactory("sub");
export const sup = tagFactory("sup");
export const del = tagFactory("del");
export const ins = tagFactory("ins");
export const blockquote = tagFactory("blockquote");
export const cite = tagFactory("cite");
export const pre = tagFactory("pre");
export const code = tagFactory("code");
export const br = tagFactory("br");
export const hr = tagFactory("hr");
export const abbr = tagFactory("abbr");
export const dfn = tagFactory("dfn");
export const q = tagFactory("q");
export const kbd = tagFactory("kbd");
export const samp = tagFactory("samp");
export const time = tagFactory("time");
export const bdi = tagFactory("bdi");
export const bdo = tagFactory("bdo");
export const wbr = tagFactory("wbr");

// Формы
export const form = tagFactory("form");
export const input = tagFactory("input");
export const textarea = tagFactory("textarea");
export const button = tagFactory("button");
export const label = tagFactory("label");
export const select = tagFactory("select");
export const option = tagFactory("option");
export const progress = tagFactory("progress");
export const meter = tagFactory("meter");
export const fieldset = tagFactory("fieldset");
export const legend = tagFactory("legend");
export const optgroup = tagFactory("optgroup");
export const datalist = tagFactory("datalist");
export const output = tagFactory("output");

// Списки и таблицы
export const ul = tagFactory("ul");
export const ol = tagFactory("ol");
export const li = tagFactory("li");
export const table = tagFactory("table");
export const tr = tagFactory("tr");
export const td = tagFactory("td");
export const th = tagFactory("th");
export const thead = tagFactory("thead");
export const tbody = tagFactory("tbody");
export const tfoot = tagFactory("tfoot");
export const caption = tagFactory("caption");
export const colgroup = tagFactory("colgroup");
export const col = tagFactory("col");
export const dl = tagFactory("dl");
export const dt = tagFactory("dt");
export const dd = tagFactory("dd");
export const menu = tagFactory("menu");

// Медиа и прочее
export const a = tagFactory("a");
export const img = tagFactory("img");
export const audio = tagFactory("audio");
export const video = tagFactory("video");
export const canvas = tagFactory("canvas");
export const figure = tagFactory("figure");
export const figcaption = tagFactory("figcaption");
export const details = tagFactory("details");
export const summary = tagFactory("summary");
export const picture = tagFactory("picture");
export const source = tagFactory("source");
export const track = tagFactory("track");
export const iframe = tagFactory("iframe");
export const embed = tagFactory("embed");
export const area = tagFactory("area");
