import type { ElementChild } from "../html";
import { applyAttrs, applyShow, applyStyle, type AttrOption } from "../utils/attr-binding";
import { applyClass, type ClassOption } from "../utils/class-binding";

/** Оформление, которое функциональный компонент принимает наравне с фабриками тегов. */
export type ComponentOptions = ClassOption & AttrOption;

/**
 * Функциональный компонент — просто функция, возвращающая элемент. Отдельного класса,
 * теневого корня и своего тега у него нет, поэтому он дешевле веб-компонента: годится
 * для кусков разметки, которым не нужны ни изоляция стилей, ни собственные атрибуты.
 *
 *   const Card = createComponent<{ title: string }>((props, ...children) =>
 *     section({ class: "card" }, h3(props.title), ...children),
 *   );
 *
 *   Card({ title: "Отчёт", class: ["wide"] }, p("тело"));
 *
 * Обёртка добавляет к пропсам class/attrs/style/show и вешает их на корневой элемент —
 * тогда вызывающий оформляет компонент так же, как обычный тег.
 *
 * Эффекты, созданные внутри, принадлежат тому компоненту, в чьём render() шёл вызов,
 * — то есть умирают вместе с ним, как и всё остальное в разметке.
 */
export const createComponent =
  <Props extends object, Root extends HTMLElement>(
    render: (props: Props, ...children: ElementChild[]) => Root,
  ) =>
  (props: Props & ComponentOptions, ...children: ElementChild[]): Root => {
    const element = render(props, ...children);

    if (props.attrs) applyAttrs(element, props.attrs);
    if (props.style) applyStyle(element, props.style);
    // show после style: он запоминает инлайновый display, а его выставляет style.
    if (props.show !== undefined) applyShow(element, props.show);
    if (props.class !== undefined) applyClass(element, props.class);

    return element;
  };
