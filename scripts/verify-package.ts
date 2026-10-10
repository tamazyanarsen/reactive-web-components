/**
 * Проверяет собранный пакет глазами потребителя: что файлы на месте, что собранный
 * JS действительно работает в браузерной среде и что типы разрешаются при строгой
 * резолюции модулей (node16), а не только при бандлерной.
 *
 * Запускается после build: bun run verify:package
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const ok = (message: string) => console.log(`✓ ${message}`);

// --- 1. состав пакета -------------------------------------------------------------

for (const file of ["dist/index.js", "dist/index.d.ts", "LICENSE", "README.md"]) {
  if (!existsSync(file)) fail(`нет файла ${file} — соберите пакет через bun run build`);
}
ok("файлы пакета на месте");

const types = await Bun.file("dist/index.d.ts").text();
if (/^\s*import\s/m.test(types)) {
  fail("в dist/index.d.ts остались импорты — типы должны быть самодостаточными");
}
ok("типы самодостаточны, без внешних импортов");

// --- 2. собранный JS работает ------------------------------------------------------

GlobalRegistrator.register();

const rwc = await import("../dist/index.js");

class Greeting extends rwc.defineComponent({
  props: { name: "мир" },
  events: { greeted: rwc.payload<string>() },
  styles: rwc.css`:host { display: block }`,
}) {
  render() {
    return rwc.div({ class: ["greeting"] }, () => `привет, ${this.props.name()}`);
  }
}

const greeting = rwc.useCustomComponent(Greeting, "verify-greeting");

const name = rwc.signal("rwc");
const app = rwc.createRoot(() => rwc.div({}, greeting({ ".name": name })));
document.body.append(app);

const host = app.firstElementChild as HTMLElement;
const shadow = host.shadowRoot;
if (!shadow) fail("shadow root недоступен — по умолчанию он должен быть open");

/** Через функцию, а не переменной: иначе TypeScript сузит тип до первого сравнения. */
const shadowText = () => shadow.textContent ?? "";

const expectText = (expected: string, message: string) => {
  if (shadowText() !== expected) fail(`${message}; в разметке ${JSON.stringify(shadowText())}`);
};

expectText("привет, rwc", "компонент отрендерился не так, как ожидалось");
ok("компонент из собранного пакета рендерится");

name.set("мир");
expectText("привет, мир", "реактивность в собранном пакете не работает");
ok("реактивность в собранном пакете работает");

if (shadow.adoptedStyleSheets.length !== 1) fail("static styles не попали в shadow root");
ok("стили компонента подключены");

host.remove();
// Уборка отложена на микрозадачу: так перемещение по DOM не пересоздаёт компонент.
await new Promise((resolve) => setTimeout(resolve, 0));
expectText("", "при отключении компонент не убрал за собой разметку");

name.set("после отключения");
expectText("", "эффекты пережили отключение компонента");
ok("при отключении разметка и эффекты убираются");

// --- 3. типы разрешаются при node16 ------------------------------------------------

const sandbox = join("node_modules", ".rwc-verify");
rmSync(sandbox, { recursive: true, force: true });
mkdirSync(sandbox, { recursive: true });

writeFileSync(
  join(sandbox, "consumer.ts"),
  `import { defineComponent, div, signal, useCustomComponent, type ReadonlySignal } from "../../dist/index.js";

const count: ReadonlySignal<number> = signal(1);

class Widget extends defineComponent({ props: { value: 0 } }) {
  render() {
    return div({}, () => String(this.props.value() + count()));
  }
}

export const widget = useCustomComponent(Widget, "verify-widget");
export const node = widget({ ".value": count });
`,
);

writeFileSync(
  join(sandbox, "tsconfig.json"),
  JSON.stringify(
    {
      compilerOptions: {
        // Строгая резолюция: именно она ломается, когда в .d.ts остаются
        // относительные импорты без расширений.
        module: "node16",
        moduleResolution: "node16",
        target: "ESNext",
        lib: ["ESNext", "DOM", "DOM.Iterable"],
        strict: true,
        noEmit: true,
        types: [],
      },
      include: ["consumer.ts"],
    },
    null,
    2,
  ),
);

const typecheck = Bun.spawnSync(["bunx", "tsc", "-p", join(sandbox, "tsconfig.json")], {
  stdout: "pipe",
  stderr: "pipe",
});

if (typecheck.exitCode !== 0) {
  console.error(typecheck.stdout.toString(), typecheck.stderr.toString());
  fail("потребитель с moduleResolution node16 не смог разрешить типы пакета");
}
rmSync(sandbox, { recursive: true, force: true });
ok("типы разрешаются при moduleResolution node16");

console.log("\nпакет пригоден к публикации");
