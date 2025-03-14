import { ComponentConfig, ComponentContent, HtmlTagName } from "@shared/types"
import { BaseElementConstructor, createCustomElement, createEl, CustomComponentConfig } from "./html-elements"

export const checkCall = (ctx: HTMLElement, fn?: (...args: any[]) => any) => { if (fn) fn.call(ctx) }

export const log = (...values: string[]) => console.log(
  values.join(' | '),
  ...Array.from(values.join('').matchAll(/%c/gm))
    .map((_, ind) => ind % 2 === 0 ? 'color:red' : 'color:inherit')
)

export const camelToKebab = (v: string) => v.replace(/([A-Z])/gm, v => `-${v.toLowerCase()}`)
export const kebabToCamel = (v: string) => v.replace(/-(\w)/gm, (_, v) => v.toUpperCase())

export const getElementFromTemplate = <T extends BaseElementConstructor>(
  strings: TemplateStringsArray, ...values: [T?, ...any]
): T extends BaseElementConstructor
  ? (...content: ComponentContent[]) => ComponentConfig<InstanceType<T>> & CustomComponentConfig<InstanceType<T>>
  : (...content: ComponentContent[]) => ComponentConfig<any> => {
  console.log(strings, values)
  const result = [strings[0]];

  let isCustom = false;

  values.forEach((value, i) => {
    let newValue = value;
    if (i === 0) {
      if (typeof value === 'function' && 'tagName' in value) {
        if (strings[0] === '') {
          newValue = value.tagName
          isCustom = true;
        }
        else {
          newValue = 'div'
          console.error('Неправильное размещение конструктора для кастомного элемента');
        }
      }
    }
    result.push(String(newValue), strings[i + 1]);
  });
  const resultTagStr = result.join('')
  if (isCustom) {
    const [customTagName, ...classList] = resultTagStr.split(' ');
    return createCustomElement<InstanceType<T>>(customTagName).addClass(...classList).set
  }
  else return createEl(resultTagStr as `${HtmlTagName} ${string}`)
