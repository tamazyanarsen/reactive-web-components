/**
 * Галерея примеров: только раскладка, вся реактивность живёт внутри компонентов.
 *
 * Каждый пример — отдельный файл, который экспортирует и сам компонент (его можно
 * забрать в свой проект как есть), и демонстрацию для этой страницы.
 */
import { cls, div, h1, h2, header, p, section, span } from "../src/shared/components/html";
import { example as counterExample } from "./counter";
import { example as functionComponentsExample } from "./function-components";
import { example as ratingExample } from "./rating";
import { example as searchExample } from "./search";
import { example as stopwatchExample } from "./stopwatch";
import { example as tabsExample } from "./tabs";
import { example as toggleSwitchExample } from "./toggle-switch";
import type { Example } from "./shared";

const EXAMPLES: Example[] = [
  counterExample,
  toggleSwitchExample,
  stopwatchExample,
  ratingExample,
  searchExample,
  tabsExample,
  functionComponentsExample,
];

document.getElementById("app")!.append(
  header(
    h1("rwc — примеры компонентов"),
    p(
      "Готовые компоненты на сигналах и фабриках тегов. Каждый живёт в собственном " +
        "shadow root, возит свои стили и умирает вместе со своими эффектами.",
    ),
  ),
  ...EXAMPLES.map((example) =>
    section(
      cls`section`,
      div(cls`head`, h2(example.title), span(cls`file`, example.file)),
      p(cls`hint`, example.hint),
      example.mount(),
    ),
  ),
);
