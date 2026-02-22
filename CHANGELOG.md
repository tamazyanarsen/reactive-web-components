## [2.64.0] - 2026-02-22

### 🚀 Features

- Удалить устаревшую документацию и диаграмму

### 📚 Documentation

- Добавить документацию на русском и английском языках

### ⚙️ Miscellaneous Tasks

- Add commitlint and husky hooks
## [2.63.11] - 2026-02-12

### 🚀 Features

- *(types)* Разрешить null в ref компонента
## [2.63.9] - 2026-02-04

### 🚀 Features

- Добавить вывод версии приложения в консоль
## [2.63.8] - 2026-02-03

### 🚀 Features

- Добавить файл конфигурации npm
- *(signal)* Выделить функцию callCb для выполнения эффектов
## [2.63.1] - 2026-01-30

### 🚀 Features

- *(component)* Добавить работу с классами; настроить получение старого значения сигнала (дописать)
- *(signal)* #2 добавить возможность изменения сигнала через функцию (with old value)
- *(core)* Добавить подсказки для создания событий, атрибутов
- *(signal)* Убрать повторную регистрацию сигналов внутри одного эффекта
- *(signal)* Добавить возможность создания эффекта внутри объекта компонента без объявления отдельной функции
- *(component.slot)* Добавить обработку слота и контекста для кастомных компонентов
- *(component)* Добавить возможность создания реактивного контента внутри элементов/компонентов (обычные и кастомные)
- *(core.component)* Добавить типизацию для добавления атрибутов для обычных и кастомных компонентов
- *(core)* Добавить проверку типов для значений атрибутов
- *(select)* Добавить элемент select с множественным выбором
- *(select)* Добавить css для компонента select/dropdown
- *(signal,effect)* Добавить возможность использования вложенных эффектов
- *(dropdown)* Добавить возможность выбора только одного элемента
- *(select)* Добавить атрибут is-multi для настройки количества выбираемых элементов
- *(component)* Добавить возможность создания конфига реактивных css-классов для компонента
- *(rx-switch, core)* Добавить компонент switch; добавить возможность управления компонентом при обработке события
- *(custom-component)* Добавить поддержку реактивных (vue:v-model) значений для полей формы
- *(core)* Улучшить подсказку для атрибутов кастомных компонентов
- *(icon)* Добавить компонент icon для avg иконок
- *(icon)* Подключить иконку через img
- *(switch)* Добавить анимацию на переключение
- *(select)* Закрытие dropdown после выбора элемента
- Прокидывание кастомных атрибутов
- Упрощённая возможность создания элемента с классами и атрибутами
- Реактивные составные строки
- *(custom-element)* Возможность прокидывания типизированного конфига инициализации компонента
- *(component)* Возможность передавать массив фацлов со стилями
- *(component.init)* Возможность добавления реактивных классов при инициализации
- *(component)* Добавить удобные обертки для создания компонента
- *(component)* Упростить создание компонента
- *(component)* Получение контента из сигнала
- *(component)* Добавить сигнал в качестве возможного контента
- Типизация observedAttributes
- *(component)* Универсальный метод для создания компонентов
- Создание кастомного компонента из конструктора
- Создание кастомных компонентов
- *(component.attribute)* Передача функции для разложения сигнала внутри конфига для атрибутов
- Icon click
- *(core.component)* По умолчанию shadowRoot closed
- Возможность прокидывания строк и функций внутри .addClass
- Метод setClass
- Синтаксический сахар для создания элементов
- Add first render check and delay for component rendering
- Enhance package.json with metadata, keywords, and repository information
- Update package.json structure with additional metadata and enhance component rendering logic
- Include README.md in the build output alongside package.json
- Enhance signal and effect functions with optional naming and improved effect tracking
- Add optional config parameter for naming in signal and effect functions
- Add setEffectDebugEnabled function to control effect debug state
- Introduce Test component and enhance signal management in main.ts; refactor HTML content handling to use replaceChildren for better performance
- Add debounce and throttle functions, implement drag-and-drop list using getList for optimized rendering
- Implement drag-and-drop functionality with ddList for improved item rendering
- Enhance effect scheduling mechanism in signal utility
- Добавить поддержку реактивных атрибутов и рефов

### 🐛 Bug Fixes

- *(button)* Исправить ошибку после тестирования функционала событий
- *(core)* Исправить создание компонента с привязкой к shadowRoot
- *(dropdown)* Очистить сигнал перед повторной инициализацией эффекта
- *(dropdown)* Исправить повторние создание эффектов со ссылкой на те же сигналы
- *(select)* Убрать ограничение на ширину выбранного элемента (label) для одиночного выбора
- *(button)* Уменьшить время анимации
- *(switch)* Исправить продолжительность анимацию на переключение
- Неработающий механизм слотов при переносе строки
- Подключение файла со стилями
- *(rs)* Работа со всеми типами
- *(rs)* Работа со всеми типами
- Добавление классов через строку
- Обновить проверку на принадлежность к сигналу
- Парсинг строки для применения tailwind классов
- *(component)* Исправить добавление контента для компонента
- *(getSignalContent)* Вывод типов
- *(getSignalContent)* Остаются старые элементы при добавлении новых после изменения значения сигнала
- *(component:createEl)* Типизация атрибутов для компонента через createEL()
- Создание пустого атрибута class и попытка создания элемента из undefined
- Ошибка в синтаксисе
- Типизация для универсального компонента
- Некорректная проверка конфига кастомного компонентна
- Css.display-flex для div-оберток для эффектов и сигналов
- Лишняя обертка для текстового контента внутри компонента
- Применение стилей для веб-компонента
- Использование classList с функциями и сигналами
- Add debug logging to component rendering process for improved traceability
- Ensure slot content is appended correctly during component rendering
- Add optional chaining to prevent errors when replacing host elements
- Undefined attribute value check in element helper

### 💼 Other

- *(input)* Настроить border и анимацию
- *(select)* Добавить стили для компонента
- *(button)* Изменить внешний вид кнопки, убрать границы
- Конфиг сборки
- Конфиг сборки
- Типизация для внешнего использования
- Типизация и подсказки для атрибутов
- *(component)* Типизация для всех событий
- Сборка библиотеки
- Типизация для методов

### 🚜 Refactor

- Удалить неиспользуемую зависимость
- Добавить вывод компонентов на главную страницу
- *(component)* Изменить тип по умолчанию для создания события unknown => void
- *(core)* Добавить метод setReactiveAttribute для более удобного присваивания
- Оставить замечания для рефакторинга
- Упрощена запись
- Эффекты и сигналы работают на подписчиках без браузерных событий
- Порядок применения стилей и рендеринг
- Использование сигналов внутри классов
- Очищение слотов и внутреннего содержимого shadowroot во время disconnectedCallback
- Remove unnecessary 'files' field from package.json and vite.config.ts
- Streamline component rendering by removing unnecessary setTimeout for connectedCallback
- Enhance element creation and rendering by optimizing content handling and updating signal management
- Improve type handling and logging in element and signal management, streamline content processing in custom elements
- Enhance getReactiveTemplate function with improved type handling and content processing
- Streamline main.ts by removing unused imports and adding new renderIf functions for conditional rendering
- Simplify logging in wrapperEffectCallback for improved clarity
- Optimize signal pipe function for better performance and clarity
- Update effectMap structure to support multiple signals and improve effect tracking
- Add combineLatest function for improved signal handling
- Improve state management in getList and enhance formatting in signal functions
- Enhance component lifecycle management and clean up signal handling
- Remove unused effect handling code and test method from HtmlComponentConfig
- Simplify effect callback handling in signal utility
- Optimize effect management by using Set for callbacks in HtmlComponentConfig
- Improve cleanup process for effect callbacks in signal utility
- Add children tracking to effect metadata for improved lifecycle management
- Enhance signal and effect management with improved subscriber tracking and cleanup
- Add isFake check to optimize effect callback handling and cleanup
- Replace componentStackFunc with componentStack for improved component lifecycle management and effect tracking
- Update configCustomComponent to return typed useCustomComponent and streamline component initialization
- Optimize signal and effect management by using WeakRefs for improved memory handling and cleanup
- Enhance addEffect method to support optional keys for better effect management and cleanup
- Streamline component initialization and effect management; enhance signal handling and cleanup in main.ts and utils
- Replace createEffect with effect for improved effect management and cleanup; enhance signal handling with WeakRefs in utils
- Enhance effect management by introducing effectSet for components; remove componentStack for improved memory handling and cleanup
- Improve effect cleanup in component lifecycle; enhance mutation observation for better memory management
- Enhance effect management by adding WeakRef support for components; clean up unused mutation observer in element initialization
- Simplify showIf function by integrating effect management directly into template handling for improved readability and performance
- Reset component state during disconnection to improve memory management and prevent potential leaks
- Enhance component and effect management by integrating WeakRef support and improving state handling for better memory efficiency
- Improve component configuration and rendering by integrating ExtraHTMLElement type for enhanced type safety and memory management
- Remove unused throttle function and clean up ddList implementation
- Improve code structure and enhance component functionality
- Optimize newGetList function for improved element handling
- Clean up newGetList function by removing console logs
- Rename newGetList to getList for consistency
- Update container style in getList function
- Enhance flushEffects function for improved error handling and recursion protection

### 📚 Documentation

- Добавить инструмент для генерации документации API
- Update README to include combineLatest usage and differences with forkJoin

### 🎨 Styling

- *(element)* Форматирование кода и исправление бага в getList
- Форматирование кода в element.ts и vite.config.ts

### 🧪 Testing

- *(input)* Протестировать работу сигналов для input
- *(effect)* Убрать поведение, при котором повторяется регистрация set функции сигнала для вложенных эффектов

### ⚙️ Miscellaneous Tasks

- Mark getReactiveTemplate as deprecated in element utility
- Add deprecation comment for getReactiveTemplate function in element utility
- Update version to 2.51.14 in package.json
- Update package name to @reactive-web-components/rwc and add license information in package-lock.json
- Update package version to 2.59.0 in package.json
- Упростить планирование эффектов в signal
