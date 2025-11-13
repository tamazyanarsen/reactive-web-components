import { ChildrenContent, ComponentInitConfig, HtmlTagName, isComponentInitConfig } from '../../types/element';
import { el } from '../html-elements/element';

// Типизированная фабрика для HTML-тегов
// Позволяет получить автодополнение для config для каждого тега

type HtmlFactories = {
    [K in HtmlTagName]: (
        config?: ComponentInitConfig<HTMLElementTagNameMap[K]> | ChildrenContent<HTMLElementTagNameMap[K]>,
        ...content: ChildrenContent<HTMLElementTagNameMap[K]>[]
    ) => ReturnType<ReturnType<typeof el<K>>>;
};

const htmlFactories = {} as HtmlFactories;

const TAGS: HtmlTagName[] = [
    'div', 'span', 'section', 'input', 'button', 'table', 'tr', 'td', 'th', 'ul', 'li', 'ol', 'form', 'label', 'select', 'option', 'textarea', 'img', 'a', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'hr', 'pre', 'code', 'nav', 'header', 'footer', 'main', 'aside', 'article', 'figure', 'figcaption', 'blockquote', 'cite', 'small', 'strong', 'em', 'b', 'i', 'u', 's', 'sub', 'sup', 'mark', 'del', 'ins', 'details', 'summary', 'progress', 'meter', 'audio', 'video', 'canvas', 'slot'
];

TAGS.forEach(tag => {
    // @ts-expect-error: динамическое присваивание
    htmlFactories[tag] = (
        config?: ComponentInitConfig<HTMLElementTagNameMap[typeof tag]> | ChildrenContent<HTMLElementTagNameMap[typeof tag]>,
        ...content: ChildrenContent<HTMLElementTagNameMap[typeof tag]>[]
    ) => {
        let resultContent = [...content];
        if (config && !isComponentInitConfig(config)) {
            // resultContent.unshift(config as ChildrenContent<HTMLElementTagNameMap[typeof tag]>);
            resultContent = [config as ChildrenContent<HTMLElementTagNameMap[typeof tag]>].concat(resultContent);
        }
        return el(tag, isComponentInitConfig(config) ? config : {})(...resultContent);
    };
});

// Экспортируем строго типизированные функции для популярных тегов
export const div = htmlFactories.div;
export const span = htmlFactories.span;
export const section = htmlFactories.section;
export const input = htmlFactories.input;
export const button = htmlFactories.button;
export const table = htmlFactories.table;
export const tr = htmlFactories.tr;
export const td = htmlFactories.td;
export const th = htmlFactories.th;
export const ul = htmlFactories.ul;
export const li = htmlFactories.li;
export const ol = htmlFactories.ol;
export const form = htmlFactories.form;
export const label = htmlFactories.label;
export const select = htmlFactories.select;
export const option = htmlFactories.option;
export const textarea = htmlFactories.textarea;
export const img = htmlFactories.img;
export const a = htmlFactories.a;
export const p = htmlFactories.p;
export const h1 = htmlFactories.h1;
export const h2 = htmlFactories.h2;
export const h3 = htmlFactories.h3;
export const h4 = htmlFactories.h4;
export const h5 = htmlFactories.h5;
export const h6 = htmlFactories.h6;
export const br = htmlFactories.br;
export const hr = htmlFactories.hr;
export const pre = htmlFactories.pre;
export const code = htmlFactories.code;
export const nav = htmlFactories.nav;
export const header = htmlFactories.header;
export const footer = htmlFactories.footer;
export const main = htmlFactories.main;
export const aside = htmlFactories.aside;
export const article = htmlFactories.article;
export const figure = htmlFactories.figure;
export const figcaption = htmlFactories.figcaption;
export const blockquote = htmlFactories.blockquote;
export const cite = htmlFactories.cite;
export const small = htmlFactories.small;
export const strong = htmlFactories.strong;
export const em = htmlFactories.em;
export const b = htmlFactories.b;
export const i = htmlFactories.i;
export const u = htmlFactories.u;
export const s = htmlFactories.s;
export const sub = htmlFactories.sub;
export const sup = htmlFactories.sup;
export const mark = htmlFactories.mark;
export const del = htmlFactories.del;
export const ins = htmlFactories.ins;
export const details = htmlFactories.details;
export const summary = htmlFactories.summary;
export const progress = htmlFactories.progress;
export const meter = htmlFactories.meter;
export const audio = htmlFactories.audio;
export const video = htmlFactories.video;
export const canvas = htmlFactories.canvas;
export const slot = htmlFactories.slot;
// SVG и другие специфичные теги будут добавляться по мере развития библиотеки

export default htmlFactories;

// Пример использования:
// div({ ... })(...content)
