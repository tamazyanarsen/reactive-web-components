/** userName -> user-name */
export const camelToKebab = (value: string) =>
  value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** user-name -> userName */
export const kebabToCamel = (value: string) =>
  value.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
