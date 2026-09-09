import { GlobalRegistrator } from "@happy-dom/global-registrator";

// bun test работает в Node-подобной среде без DOM. Регистрируем happy-dom глобально
// до загрузки тестов: библиотека трогает document/customElements на уровне модулей.
GlobalRegistrator.register();
