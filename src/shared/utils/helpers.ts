export const checkCall = (ctx: HTMLElement, fn?: Function) => { if (fn) fn.call(ctx) }

export const log = (...values: string[]) => console.log(
  values.join(' | '),
  ...Array.from(values.join('').matchAll(/%c/gm))
    .map((_, ind) => ind % 2 === 0 ? 'color:red' : 'color:inherit')
)

export const camelToKebab = (v: string) => v.replace(/([A-Z])/gm, v => `-${v.toLowerCase()}`)
export const kebabToCamel = (v: string) => v.replace(/-(\w)/gm, (_, v) => v.toUpperCase())
