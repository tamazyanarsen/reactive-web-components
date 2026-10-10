// Публичный API кита. Компоненты объявлены, но не зарегистрированы: приложение
// вызывает registerAll() (или register* для отдельных) и при желании задаёт постфикс.
export { tokens, controlStyles } from "./tokens";
export { Button, registerButton, rwcButton, type ButtonSize, type ButtonVariant } from "./components/button";
