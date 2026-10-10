/**
 * Плагин для @custom-elements-manifest/analyzer: учит его понимать компоненты rwc.
 *
 * Стандартный анализатор видит `class X extends defineComponent({...})` как обычный
 * класс с непонятным предком и не знает тега, который назначает useCustomComponent.
 * Плагин достаёт из объявления пропсы (поля + атрибуты), события и отражение в атрибуты,
 * а из вызова регистрации — имя тега. Из манифеста дальше работают автодополнение
 * в редакторах, Storybook и генераторы обёрток для React/Vue/Angular.
 *
 *   // custom-elements-manifest.config.js
 *   import { rwcPlugin } from "@rwcjs/cem-plugin";
 *   export default { globs: ["src/**\/*.ts"], plugins: [rwcPlugin()] };
 */

/** Члены HTMLElement, которые компонент не перекрывает аксессором — см. defineComponent. */
const NATIVE_MEMBERS = new Set([
  "id", "title", "lang", "dir", "hidden", "slot", "className", "tabIndex", "accessKey",
  "draggable", "inert", "popover", "translate", "spellcheck", "autofocus", "nonce", "style",
  "props", "events", "slots", "internals", "formDisabled",
]);

/** Числовые константы, которые часто служат значением по умолчанию: Infinity, Number.MAX_SAFE_INTEGER. */
const NUMERIC_CONSTANTS = /^-?(Infinity|NaN|Number\.[A-Z_]+|Math\.[A-Z0-9_]+)$/;

const camelToKebab = (name) => name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

/**
 * @param {{ defineComponent?: string[]; register?: string[] }} [options]
 *   Имена функций, если их переименовали при импорте.
 */
export function rwcPlugin(options = {}) {
  const defineNames = new Set(options.defineComponent ?? ["defineComponent"]);
  const registerNames = new Set(options.register ?? ["useCustomComponent", "configCustomComponent"]);

  /** Тег по имени класса, собранный в фазе analyze; путь модуля — ключ первого уровня. */
  const tagsByModule = new Map();

  return {
    name: "rwc",

    analyzePhase({ ts, node, moduleDoc }) {
      if (ts.isClassDeclaration(node) && node.name) {
        const config = findDefineConfig(ts, node, defineNames);
        if (!config) return;
        const classDoc = moduleDoc.declarations.find(
          (declaration) => declaration.kind === "class" && declaration.name === node.name.text,
        );
        if (classDoc) applyConfig(ts, config, classDoc);
        return;
      }

      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        if (!registerNames.has(node.expression.text)) return;
        const [componentArg, tagArg] = node.arguments;
        if (!componentArg || !tagArg || !ts.isIdentifier(componentArg)) return;
        if (!ts.isStringLiteralLike(tagArg)) return;

        let tags = tagsByModule.get(moduleDoc.path);
        if (!tags) tagsByModule.set(moduleDoc.path, (tags = new Map()));
        tags.set(componentArg.text, tagArg.text);
      }
    },

    moduleLinkPhase({ moduleDoc }) {
      const tags = tagsByModule.get(moduleDoc.path);
      if (!tags) return;

      for (const [className, tagName] of tags) {
        const classDoc = moduleDoc.declarations.find(
          (declaration) => declaration.kind === "class" && declaration.name === className,
        );
        if (!classDoc) continue;
        classDoc.customElement = true;
        classDoc.tagName = tagName;

        moduleDoc.exports ??= [];
        const alreadyExported = moduleDoc.exports.some(
          (entry) => entry.kind === "custom-element-definition" && entry.name === tagName,
        );
        if (!alreadyExported) {
          moduleDoc.exports.push({
            kind: "custom-element-definition",
            name: tagName,
            declaration: { name: className, module: moduleDoc.path },
          });
        }
      }
    },
  };
}

/** Объект-конфиг из `extends defineComponent({...})`, если класс объявлен так. */
function findDefineConfig(ts, node, defineNames) {
  for (const clause of node.heritageClauses ?? []) {
    if (clause.token !== ts.SyntaxKind.ExtendsKeyword) continue;
    for (const type of clause.types) {
      const call = type.expression;
      if (!ts.isCallExpression(call) || !ts.isIdentifier(call.expression)) continue;
      if (!defineNames.has(call.expression.text)) continue;
      const [config] = call.arguments;
      if (config && ts.isObjectLiteralExpression(config)) return config;
    }
  }
  return null;
}

/** Значение свойства объектного литерала по имени. */
function propertyOf(ts, object, name) {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    if (propertyName(ts, property) === name) return property.initializer;
  }
  return null;
}

function propertyName(ts, property) {
  const { name } = property;
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) return name.text;
  return null;
}

function description(property) {
  const comment = property.jsDoc?.[0]?.comment;
  if (!comment) return undefined;
  return typeof comment === "string" ? comment : comment.map((part) => part.text).join("");
}

/** Тип и значение по умолчанию из инициализатора пропса — синтаксически, без чекера. */
function inferProp(ts, expression) {
  let typeText;
  let value = expression;

  // `"plain" as Variant`, `<Variant>"plain"`, `x satisfies T` — тип берём из аннотации.
  while (
    ts.isAsExpression(value) ||
    ts.isTypeAssertionExpression?.(value) ||
    ts.isSatisfiesExpression?.(value) ||
    ts.isParenthesizedExpression(value)
  ) {
    if (!ts.isParenthesizedExpression(value) && !typeText) typeText = value.type.getText();
    value = value.expression;
  }

  if (!typeText) {
    if (ts.isStringLiteralLike(value) || ts.isTemplateExpression(value)) typeText = "string";
    else if (ts.isNumericLiteral(value)) typeText = "number";
    else if (ts.isPrefixUnaryExpression(value) && ts.isNumericLiteral(value.operand)) typeText = "number";
    else if (NUMERIC_CONSTANTS.test(value.getText())) typeText = "number";
    else if (value.kind === ts.SyntaxKind.TrueKeyword || value.kind === ts.SyntaxKind.FalseKeyword) {
      typeText = "boolean";
    } else if (value.kind === ts.SyntaxKind.NullKeyword) typeText = "null";
    else if (ts.isArrayLiteralExpression(value)) typeText = "unknown[]";
    else if (ts.isObjectLiteralExpression(value)) typeText = "object";
  }

  return { typeText, defaultText: value.getText() };
}

/** Тип payload из `payload<T>()`. */
function inferPayload(ts, expression) {
  if (ts.isCallExpression(expression) && expression.typeArguments?.length) {
    return expression.typeArguments[0].getText();
  }
  return undefined;
}

function applyConfig(ts, config, classDoc) {
  classDoc.customElement = true;
  classDoc.attributes ??= [];
  classDoc.members ??= [];
  classDoc.events ??= [];

  const reflected = new Set();
  const reflectList = propertyOf(ts, config, "reflect");
  if (reflectList && ts.isArrayLiteralExpression(reflectList)) {
    for (const element of reflectList.elements) {
      if (ts.isStringLiteralLike(element)) reflected.add(element.text);
    }
  }

  const props = propertyOf(ts, config, "props");
  if (props && ts.isObjectLiteralExpression(props)) {
    for (const property of props.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const name = propertyName(ts, property);
      if (!name) continue;

      const { typeText, defaultText } = inferProp(ts, property.initializer);
      const attrName = camelToKebab(name);
      const text = description(property);
      const type = typeText ? { text: typeText } : undefined;

      classDoc.attributes.push({
        name: attrName,
        fieldName: name,
        ...(type && { type }),
        default: defaultText,
        ...(text && { description: text }),
      });

      // Свойство на элементе есть, только если имя не занято HTMLElement — как в рантайме.
      if (!NATIVE_MEMBERS.has(name)) {
        classDoc.members.push({
          kind: "field",
          name,
          privacy: "public",
          ...(type && { type }),
          default: defaultText,
          attribute: attrName,
          ...(reflected.has(name) && { reflects: true }),
          ...(text && { description: text }),
        });
      }
    }
  }

  const events = propertyOf(ts, config, "events");
  if (events && ts.isObjectLiteralExpression(events)) {
    for (const property of events.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const name = propertyName(ts, property);
      if (!name) continue;
      const payloadType = inferPayload(ts, property.initializer);
      const text = description(property);
      classDoc.events.push({
        name: camelToKebab(name),
        type: { text: payloadType ? `CustomEvent<${payloadType}>` : "CustomEvent" },
        ...(text && { description: text }),
      });
    }
  }

  const form = propertyOf(ts, config, "form");
  if (form && form.kind === ts.SyntaxKind.TrueKeyword) {
    // В схеме манифеста нет поля для form-associated — кладём рядом, как делают другие плагины.
    classDoc.formAssociated = true;
  }
}
