import { BaseElementConstructor, createCustomElement } from "./html-elements"

export const checkCall = (ctx: HTMLElement, fn?: (...args: any[]) => any) => { if (fn) fn.call(ctx) }

export const log = (...values: string[]) => console.log(
  values.join(' | '),
  ...Array.from(values.join('').matchAll(/%c/gm))
    .map((_, ind) => ind % 2 === 0 ? 'color:red' : 'color:inherit')
)

export const camelToKebab = (v: string) => v.replace(/([A-Z])/gm, v => `-${v.toLowerCase()}`)
export const kebabToCamel = (v: string) => v.replace(/-(\w)/gm, (_, v) => v.toUpperCase())

export const getElementFromTemplate = <T extends BaseElementConstructor>(strings: TemplateStringsArray, componentValue?: T, ...values: any[]) => {
  console.log(strings, values)
  const result = [strings[0]];
  let customElement: T | null = null;

  if (typeof componentValue === 'function' && 'tagName' in componentValue && strings[0] === '') {
    result.push(componentValue.tagName as string)
    customElement = componentValue
  }
  else {
    console.error('Неправильное размещение конструктора для кастомного элемента')
  }

  values.forEach((value, i) => {
    result.push(String(value), strings[i + 1]);
  });
  const resultTagStr = result.join('')
  if (customElement !== null) {
    console.log('customElement', customElement)
    return createCustomElement<InstanceType<T>>(resultTagStr)
  }
  else return resultTagStr
}
