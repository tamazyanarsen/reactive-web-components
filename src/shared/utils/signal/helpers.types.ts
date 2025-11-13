// Определяем тип, который извлекает тип из Promise
export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

// Определяем тип, который проверяет, является ли функция асинхронной
export type IsPromise<T> = T extends Promise<any> ? true : false;
export type IsPromiseFunction<T> = T extends () => Promise<any> ? true : false;