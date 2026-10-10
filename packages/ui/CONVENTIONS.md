# Как устроены компоненты @rwcjs/ui

Регламент для всех, кто добавляет или меняет компоненты кита. Образец — `src/components/button.ts`
и его тест `src/components/button.test.ts`.

## Файлы

- Один компонент — один файл `src/components/<name>.ts` и тест `src/components/<name>.test.ts`.
  Компоненты, которые работают только вместе (`tabs` + `tab` + `tab-panel`), живут в одном файле.
- Общие файлы — `src/index.ts`, `src/tokens.ts`, `src/theme.css`, `README.md` — меняются
  отдельно и осознанно: от них зависят все компоненты.

## Объявление

- `defineComponent({ props, events, reflect, styles, ... })`, класс экспортируется.
- Регистрация через `configCustomComponent(Class, "rwc-<name>")`, экспортируются
  `[rwc<Name>, register<Name>]`. Кит сам ничего не регистрирует — это делает приложение.
- Каждый пропс и событие — с однострочным JSDoc: из него собирается Custom Elements Manifest.
- Объединения строк — через `as`: `variant: "info" as AlertVariant`, тип экспортируется.
- В `reflect` — пропсы, от которых зависят стили (`variant`, `size`, `disabled`, `open`, `checked`...).
- Стили — массив `[tokens, css\`...\`]`; для контролов форм ещё `controlStyles`. Цвета, радиусы,
  отступы и длительности — только через приватные переменные `--_*` из `tokens.ts`, никаких
  жёстких значений цвета. Анимации используют `var(--_duration)` (уважает reduced motion).
- Фокусируемые компоненты: `shadow: { mode: "open", delegatesFocus: true }`.

## Формы

- Контролы, которые отдают значение (`input`, `checkbox`, `select`...), объявляются с `form: true`:
  `this.setFormValue(...)` в `render()`, валидация через `this.internals.setValidity(...)`,
  сброс формы — переопределением `formReset()` при необходимости.
- Пропсы `name`, `value`, `disabled`, `required` называются как у нативных элементов.
- Учитывать `this.formDisabled()` — отключение через `<fieldset disabled>`.
- Изменение значения пользователем — событие `change` (`payload<T>()` со значением);
  если значение меняется на каждый ввод, дополнительно `input`.

## Доступность

- Роли и состояния ARIA там, где нет нативного элемента (`role="switch"`, `aria-checked`,
  `aria-expanded`, `aria-selected`, `aria-controls`...).
- Клавиатура по [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/):
  Enter/Space для активации, стрелки в группах (tabs, radio-group, menu), Escape закрывает
  оверлеи, Home/End где уместно.
- Оверлеи: фокус переходит внутрь при открытии и возвращается на прежний элемент при закрытии;
  у модального диалога — ловушка фокуса. Для диалога и поповеров предпочтительны нативные
  `<dialog>` и Popover API.
- Декоративные элементы — `aria-hidden="true"`.

## Тесты

- `bun:test` + happy-dom, помощники из `src/test-utils.ts`: `registerFresh(register)` в начале файла,
  `mount`, `shadow`, `click`, `press`, `tick`, `internalsOf` (заглушка ElementInternals).
- Проверять: рендер и отражение атрибутов, события, клавиатуру, ARIA, значение формы, disabled.
- happy-dom не умеет раскладку и анимации — геометрию и переходы не тестировать.
