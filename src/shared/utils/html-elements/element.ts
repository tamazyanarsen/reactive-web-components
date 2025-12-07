import { HANDLE_SLOT_CONTEXT_NAME } from "@shared/constants/constants";
import {
  ChildrenContent,
  CompFuncContent,
  ComponentConfig,
  ComponentInitConfig,
  CustomComponentConfig,
  ExtraHTMLElement,
  HtmlTagName
} from "../../types/element";
import { projectLog } from "../helpers";
import { effect, isReactiveSignal, ReactiveSignal, signal } from "../signal";
import {
  appendContentItem,
  elementHelpers,
  initComponent
} from "./element-helper";

export const createElement = <K extends HtmlTagName>(
  tagName: K,
  config?: ComponentInitConfig<HTMLElementTagNameMap[K]>,
): ComponentConfig<HTMLElementTagNameMap[K]> => {
  const wrapper = document.createElement<K>(tagName);
  const component = elementHelpers(wrapper);
  return initComponent(component, config);
};

export const createEl = <K extends HtmlTagName>(
  tagName: `${K} ${string}` | K,
  config?: ComponentInitConfig<HTMLElementTagNameMap[K]>,
) => {
  const [baseTag, ...classes] = tagName.split(" ").map((e) => e.trim());
  const element = createElement<K>(baseTag as K, config);

  if (classes.length > 0) {
    element.addClass(...classes);
  }

  return (...content: ChildrenContent<HTMLElementTagNameMap[K]>[]) => {
    return appendContentItem(
      element,
      ...content
        .filter(Boolean)
        .flat()
        .flatMap((e) =>
          typeof e === "function" && !isReactiveSignal(e)
            ? getSignalContent(() => e(element))
            : e,
        ),
    );
  };
};

export const getSignalContent = (cb: CompFuncContent) => {
  const effectId = `getSignalContent_${Math.random().toString(36).substring(2, 15)}`;
  return createElement("div")
    .addStyle({ display: "contents" })
    .addEffect((self) => {
      self.clear();
      appendContentItem(self, ...[cb()].flat());
    }, effectId);
}


// type WrapFuncReturnType<Cb extends CompFuncContent> =
//   ReturnType<Cb> extends any[]
//   ? ComponentConfig<any>[]
//   : ComponentConfig<any>;
// /**
//  * @deprecated
//  */
// export const getReactiveTemplate = <Cb extends CompFuncContent>(cb: Cb): ReturnType<typeof cb> => {
//   const handleItem = (item: ComponentContent): ComponentConfig<any> => {
//     if (typeof item === "string") {
//       if (item.trim().length > 0) return elementHelpers(textContentWrapper(item));
//       else return createEl('div')() as ComponentConfig<any>;
//     } else if (isReactiveSignal(item)) {
//       return elementHelpers(htmlEffectWrapper(item)) as ComponentConfig<any>;
//     } else return item as ComponentConfig<any>;
//   }

//   const wrapFunc = (): WrapFuncReturnType<Cb> => {
//     const res = cb()
//     if (res instanceof Array && Array.isArray(res)) {
//       return res.map(handleItem) as WrapFuncReturnType<Cb>;
//     } else {
//       return handleItem(res) as WrapFuncReturnType<Cb>;
//     }
//   }

//   // const wrapFunc = (): ComponentConfig<any>[] => [cb()].flat().map(handleItem)

//   return signalComponent(wrapFunc) as ReturnType<typeof cb>;
// }


/**
 * Создает реактивный список элементов, который автоматически обновляется при изменении массива данных.
 * Поддерживает эффективное обновление DOM с минимальными перерисовками.
 * 
 * @template I - Тип элементов массива (должен быть объектом)
 * @template K - Ключ для уникальной идентификации элементов
 * @param items - Реактивный сигнал с массивом данных
 * @param keyFn - Функция для получения уникального ключа элемента
 * @param cb - Функция рендеринга элемента, принимающая элемент, индекс и весь массив
 * @returns Контейнер с реактивным списком элементов
 */
export const getList = <I extends Record<string, any>, K extends keyof I>(
  items: ReactiveSignal<I[]>,
  keyFn: (item: I) => I[K] | string,
  cb: (item: I, index: number, items: I[]) => ComponentConfig<any>,
) => {
  // Создаем контейнер-обертку с display: contents для прозрачности
  const container = createElement("div").addStyle({ display: "contents" });

  // Карта сигналов для каждого элемента (используется для принудительного обновления)
  const currItemSignalMap = new Map<I[K] | string, ReactiveSignal<string>>();

  // Карта функций создания компонентов для каждого элемента
  const currItemComponentMap = new Map<
    I[K] | string,
    () => ComponentConfig<any>
  >();

  // Список ключей текущих элементов
  let itemsKeyList: string[] = [];

  // Множество зарегистрированных эффектов (для предотвращения дублирования)
  const currRegisteredEffects = new Set<string>();

  // Сохраняем предыдущее состояние массива для сравнения изменений
  let oldItems = items.peek();

  /**
   * Удаляет все данные, связанные с ключом элемента
   * @param key - Уникальный ключ элемента
   */
  const deleteKey = (key: string) => {
    currRegisteredEffects.delete(key);      // Удаляем из зарегистрированных эффектов
    currItemSignalMap.delete(key);          // Удаляем сигнал элемента
    currItemComponentMap.delete(key);       // Удаляем функцию создания компонента
  };

  // Основной эффект, который отслеживает изменения в массиве items
  effect(() => {
    // Получаем новый массив элементов
    const newItems = items();

    // Создаем список ключей из нового массива, преобразуя все в строки
    itemsKeyList = newItems
      .map(keyFn)                           // Применяем функцию получения ключа
      .map((e) => (typeof e === "string" ? e : e.toString())); // Преобразуем в строки

    // Получаем текущие дочерние элементы контейнера
    const containerChildren = Array.from(container.hostElement.children);
    projectLog("containerChildren", containerChildren, itemsKeyList);

    // Удаляем элементы, которых больше нет в новом списке
    containerChildren.forEach((e) => {
      const key = (e as HTMLElement).dataset.key as I[K]; // Получаем ключ из data-key
      if (!itemsKeyList.includes(key)) {                   // Если ключа нет в новом списке
        projectLog("remove element", key, e);
        e.remove();                                        // Удаляем элемент из DOM
        deleteKey(key);                                    // Очищаем связанные данные
      }
    });

    // Обрабатываем каждый элемент из нового списка
    itemsKeyList.forEach((key) => {
      const currItem = newItems[itemsKeyList.indexOf(key)]; // Получаем текущий элемент

      // Если это новый элемент (нет в карте сигналов)
      if (!currItemSignalMap.has(key)) {
        projectLog("create new element", key, currItem);

        // Создаем новый сигнал с случайным значением для принудительного обновления
        currItemSignalMap.set(
          key,
          signal(Math.random().toString(36).substring(2, 15)),
        );

        // Создаем функцию для генерации компонента с data-key атрибутом
        currItemComponentMap.set(key, () =>
          cb(currItem, itemsKeyList.indexOf(key), newItems).setCustomAttribute(
            "data-key",
            key,
          ),
        );
      }
      // Если элемент существует, но изменился (сравниваем JSON)
      else if (
        JSON.stringify(currItem) !==
        JSON.stringify(oldItems[itemsKeyList.indexOf(key)])
      ) {
        // Удаляем старый элемент из DOM
        container.hostElement.querySelector(`[data-key="${key}"]`)?.remove();

        // Обновляем сигнал новым случайным значением для принудительного обновления
        currItemSignalMap
          .get(key)
          ?.set(Math.random().toString(36).substring(2, 15));

        // Обновляем функцию создания компонента с новыми данными
        currItemComponentMap.set(key, () =>
          cb(currItem, itemsKeyList.indexOf(key), newItems).setCustomAttribute(
            "data-key",
            key,
          ),
        );
      }
    });

    // Сохраняем текущее состояние как старое для следующего сравнения
    oldItems = [...newItems.map(item => ({ ...item }))];

    /**
     * Создает эффекты для рендеринга элементов
     * Выполняется асинхронно для корректной работы с DOM
     */
    const createEffect = () => {
      // Проходим по всем элементам в карте сигналов
      currItemSignalMap.forEach((signalTrigger, key) => {
        projectLog("key from setTimeout foreach currItemSignalMap", key);

        // Если эффект еще не зарегистрирован для этого ключа
        if (!currRegisteredEffects.has(key)) {
          currRegisteredEffects.add(key); // Помечаем как зарегистрированный

          // Создаем эффект для рендеринга элемента
          effect(() => {
            signalTrigger(); // Читаем сигнал для подписки на изменения

            const itemIndex = itemsKeyList.indexOf(key); // Получаем индекс элемента
            const currComponent = currItemComponentMap.get(key)?.(); // Создаем компонент

            if (!currComponent) return; // Если компонент не создался, выходим

            projectLog(
              "call effect from setTimeout",
              key,
              currComponent.hostElement,
            );

            // Вставляем элемент в правильную позицию
            if (itemIndex <= container.hostElement.children.length - 1) {
              // Если позиция в пределах существующих элементов - вставляем перед элементом в этой позиции
              container.hostElement.insertBefore(
                currComponent.hostElement,
                container.hostElement.children[itemIndex],
              );
            } else {
              // Если позиция за пределами - добавляем в конец
              container.hostElement.append(currComponent.hostElement);
            }
          });
        }
      });
    };

    // Выполняем создание эффектов асинхронно через Promise
    Promise.resolve().then(() => createEffect());

    // Альтернативный способ через setTimeout (закомментирован)
    // setTimeout(() => createEffect());
  });

  // Возвращаем контейнер с реактивным списком
  return container;
};


/**
 * Создает реактивный компонент, который автоматически обновляется при изменении его зависимостей.
 * 
 * @example
 * // Создание компонента, который обновляется при изменении сигнала
 * const count = signal(0);
 * const counterComponent = signalComponent(() =>
 *   el('div', { text: () => `Счетчик: ${count()}` })
 * );
 *
 * // Позже, когда значение count изменится, компонент автоматически обновится
 * count(1); // Компонент перерендерится с текстом "Счетчик: 1"
 */
export const signalComponent = <
  T extends ExtraHTMLElement,
  R extends
  | ComponentConfig<T>
  | CustomComponentConfig<T>
  | Array<ComponentConfig<T> | CustomComponentConfig<T>>,
>(
  cb: () => R,
): R => {
  let currComponent = [createElement("div")];
  let isMulti = false;
  effect(() => {
    const reactiveComponent = cb();
    isMulti = Array.isArray(reactiveComponent);
    const newReactiveComponent: ComponentConfig<any>[] = [];
    newReactiveComponent.push(...[reactiveComponent].flat());
    if (newReactiveComponent.length === 0) {
      newReactiveComponent.push(
        createElement("div").addStyle({ display: "none" }).setAttribute("id", "empty_template") as any,
      );
    }
    try {
      projectLog('newReactiveComponent.map', newReactiveComponent.map(e => {
        projectLog('newReactiveComponent hostElement', e.hostElement)
        return e.hostElement?.id
      }))
      projectLog('currComponent[0].hostElement?.id', currComponent[0].hostElement?.id, currComponent)
      currComponent[0].hostElement?.replaceWith(
        ...newReactiveComponent.map((e) => e.hostElement),
      );
      currComponent.slice(1).forEach((e) => e.hostElement?.remove());
      currComponent = newReactiveComponent as any;
    } catch (error) {
      console.error(error);
    }
  });
  return isMulti
    ? (currComponent as unknown as ReturnType<typeof cb>)
    : (currComponent[0] as unknown as ReturnType<typeof cb>);
};

export const isSlotTemplate = (item: Element): item is ExtraHTMLElement =>
  HANDLE_SLOT_CONTEXT_NAME in item;

export const unsafeHtml = (html: string | ReactiveSignal<string>) => {
  const template = createEl("div")().addStyle({ display: "contents" });
  const setHtml = (htmlString: string) => {
    template.hostElement.innerHTML = htmlString;
    return template;
  };
  if (typeof html === "string") {
    setHtml(html);
  } else
    template.addEffect(() => {
      setHtml(html());
    });
  return template;
};

export const renderIf = (
  condition: boolean,
  content: CompFuncContent,
  elseContent?: CompFuncContent,
) =>
  condition
    ? getSignalContent(content)
    : elseContent
      ? getSignalContent(elseContent)
      : createEl('div')().setAttribute("id", "empty_div_renderIf").addStyle({ display: "none" });

export const rxRenderIf = (
  condition: ReactiveSignal<any> | (() => boolean),
  content: CompFuncContent,
  elseContent?: CompFuncContent,
) =>
  getSignalContent(() => renderIf(Boolean(condition()), content, elseContent));

/**
 * Условный рендеринг компонентов на основе условия.
 * Поддерживает как статические, так и реактивные условия.
 *
 * @template T1 - Тип HTML-элемента для основного контента
 * @template T2 - Тип HTML-элемента для альтернативного контента
 *
 * @param {boolean | ReactiveSignal<boolean> | (() => boolean)} condition - Условие для рендеринга.
 *        Может быть статическим boolean, реактивным сигналом или функцией, возвращающей boolean.
 * @param {() => ComponentConfig<T1>} content - Функция, возвращающая компонент для отображения при истинном условии
 * @param {() => ComponentConfig<T2>} [elseContent] - Опциональная функция, возвращающая компонент для отображения при ложном условии
 *
 * @returns {ComponentConfig<T1> | ComponentConfig<T2> | ''} Компонент, соответствующий условию, или пустая строка
 *
 * @example
 * // Статическое условие
 * const isVisible = true;
 * const component = when(
 *   isVisible,
 *   () => el('div', { text: 'Видимый контент' }),
 *   () => el('div', { text: 'Скрытый контент' })
 * );
 *
 * @example
 * // Реактивное условие с сигналом
 * const isActive = signal(false);
 * const component = when(
 *   isActive,
 *   () => el('div', { text: 'Активный' }),
 *   () => el('div', { text: 'Неактивный' })
 * );
 *
 * @example
 * // Условный рендеринг без elseContent
 * const hasData = signal(true);
 * const component = when(
 *   hasData,
 *   () => el('div', { text: 'Данные загружены' })
 * );
 */
export const when = (
  condition: boolean | ReactiveSignal<any> | (() => boolean),
  content: CompFuncContent,
  elseContent?: CompFuncContent,
) =>
  typeof condition === "boolean"
    ? renderIf(condition, content, elseContent)
    : rxRenderIf(condition, content, elseContent);

export const showIf = (
  condition: boolean | ReactiveSignal<any> | (() => boolean),
  template: CompFuncContent,
) => {
  const templateContent = getSignalContent(template);
  if (typeof condition === "boolean") {
    [templateContent].flat().forEach(e => e.hostElement.style.display = condition ? "block" : "none");
  } else {
    effect(() => {
      const conditionRes = condition() ? "block" : "none";
      [templateContent].flat().forEach(e => e.hostElement.style.display = conditionRes);
    })
  }
  return templateContent;
};

export const show = (
  condition: boolean | ReactiveSignal<any> | (() => boolean),
  template: CompFuncContent,
  elseTemplate?: CompFuncContent,
) => {
  const templates: ComponentConfig<any>[] = [showIf(condition, template)].flat();
  if (elseTemplate) {
    templates.push(
      ...[showIf(
        () => (typeof condition === "boolean" ? !condition : !condition()),
        elseTemplate,
      )].flat(),
    );
  }
  return getSignalContent(() => templates);
};