import { HANDLE_SLOT_CONTEXT_NAME } from "@shared/constants/constants";
import {
  ChildrenContent,
  CompFuncContent,
  ComponentConfig,
  ComponentContent,
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
  htmlEffectWrapper,
  initComponent,
  textContentWrapper
} from "./element-helper";

export const createElement = <K extends HtmlTagName>(
  tagName: K,
  config?: ComponentInitConfig<HTMLElementTagNameMap[K]>,
): ComponentConfig<HTMLElementTagNameMap[K]> => {
  const wrapper = document.createElement<K>(tagName);
  const component = {
    ...elementHelpers(wrapper),
  };
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

/**
 * @deprecated
 */
export const oldgetSignalContent = (cb: CompFuncContent) =>
  createElement("div")
    .addStyle({ display: "contents" })
    .addEffect((self) => {
      const signalContent = cb();
      const newContent: ComponentContent[] = [];
      if (Array.isArray(signalContent)) {
        newContent.push(...signalContent);
      } else {
        newContent.push(signalContent);
      }
      self.clear();
      appendContentItem(self, ...newContent);
    });


// Вспомогательный тип для обработки одного элемента
type ProcessContentItem<T> =
  T extends ComponentConfig<infer E>
  ? ComponentConfig<E>
  : T extends string | ReactiveSignal<any>
  ? ComponentConfig<HTMLSpanElement>
  : ComponentConfig<HTMLSpanElement>; // fallback

// Основной тип для обработки результата функции
type WrapFuncReturnType<Cb extends CompFuncContent> =
  ReturnType<Cb> extends (infer Item)[]
  ? ProcessContentItem<Item>[]
  : ProcessContentItem<ReturnType<Cb>>;

const itemToComponent = (item: ComponentContent): ComponentConfig<any> => {
  if (typeof item === "string") {
    if (item.trim().length > 0) return elementHelpers(textContentWrapper(item));
    else return createEl('div')() as ComponentConfig<any>;
  } else if (isReactiveSignal(item)) {
    return elementHelpers(htmlEffectWrapper(item)) as ComponentConfig<any>;
  } else return item as ComponentConfig<any>;
}

export const getSignalContent = <Cb extends CompFuncContent>(cb: Cb): WrapFuncReturnType<Cb> => {
  return signalComponent(() => {
    const res = cb()
    if (Array.isArray(res)) {
      return res.map(itemToComponent)
    } else {
      return itemToComponent(res)
    }
  }) as WrapFuncReturnType<Cb>;

}


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
    oldItems = newItems;

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
      /**
       * Удаляем все лишние элементы
       */
      currComponent.slice(1).forEach((e) => e.hostElement?.remove());

      const replaceElement = currComponent[0].hostElement

      // const parentElement = replaceElement?.parentElement
      // if (parentElement) {
      //   const children = Array.from(parentElement.children)
      //   const childIndex = children.indexOf(replaceElement)
      //   replaceElement.remove()
      //   if (childIndex === children.length - 1) {
      //     parentElement.append(...newReactiveComponent
      //       .map(e => e.hostElement)
      //       .flat())
      //   } else {
      //     newReactiveComponent
      //       .map(e => e.hostElement)
      //       .flat()
      //       .forEach(el => parentElement.insertBefore(el, children[childIndex + 1]))
      //   }
      // }
      // else 
      if (replaceElement) {
        replaceElement.replaceWith(
          ...newReactiveComponent
            .map(e => e.hostElement)
            .flat()
        )
      }
      projectLog('currComponent success replaceElement', replaceElement)
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

export const oldrenderIf = (
  condition: boolean,
  content: CompFuncContent,
  elseContent?: CompFuncContent,
) =>
  condition
    ? getSignalContent(content)
    : elseContent
      ? getSignalContent(elseContent)
      : createEl('div')().setAttribute("id", "empty_div_renderIf").addStyle({ display: "none" });

export const oldrxRenderIf = (
  condition: ReactiveSignal<any> | (() => boolean),
  content: CompFuncContent,
  elseContent?: CompFuncContent,
) =>
  oldgetSignalContent(() => oldrenderIf(Boolean(condition()), content, elseContent));

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
export const oldwhen = (
  condition: boolean | ReactiveSignal<any> | (() => boolean),
  content: CompFuncContent,
  elseContent?: CompFuncContent,
) =>
  typeof condition === "boolean"
    ? oldrenderIf(condition, content, elseContent)
    : oldrxRenderIf(condition, content, elseContent);

/**
 * @deprecated
 */
export const showIf = <Content extends CompFuncContent>(
  condition: boolean | ReactiveSignal<any> | (() => boolean),
  template: Content,
): WrapFuncReturnType<Content> => {
  const templateContent = getSignalContent(template);
  if (typeof condition === "boolean") {
    [templateContent].flat().forEach(e => e.hostElement.style.display = condition ? "block" : "none");
  } else {
    effect(() => {
      const conditionRes = condition() ? "block" : "none";
      [templateContent].flat().forEach(e => e.hostElement.style.display = conditionRes);
    })
  }
  return templateContent as WrapFuncReturnType<Content>;
};

export function show<Content extends CompFuncContent>(
  condition: boolean | ReactiveSignal<any> | (() => boolean),
  template: Content,
): WrapFuncReturnType<Content> | ComponentConfig<HTMLDivElement>;
export function show<Content extends CompFuncContent, ElseContent extends CompFuncContent>(
  condition: boolean | ReactiveSignal<any> | (() => boolean),
  template: Content,
  elseTemplate: ElseContent,
): WrapFuncReturnType<Content> | ContentType<typeof elseTemplate>
export function show<Content extends CompFuncContent, ElseContent extends CompFuncContent>(
  condition: boolean | ReactiveSignal<any> | (() => boolean),
  template: Content,
  elseTemplate?: ElseContent,
): WrapFuncReturnType<Content> | ContentType<typeof elseTemplate> {
  return getSignalContent(() => {
    const conditionRes = typeof condition === "boolean" ? condition : condition();

    const templates: ComponentConfig<any>[] = [];
    templates.push(...[template()].flat().map(e => {
      const style = conditionRes ? "block" : "none";
      return itemToComponent(e).addEffect((_, host) => { host.style.display = style })
    }
    ));
    if (elseTemplate) templates.push(...[elseTemplate()].flat().map(e => {
      const style = !conditionRes ? "block" : "none";
      return itemToComponent(e).addEffect((_, host) => { host.style.display = style })
    }
    ));
    return templates
  }) as WrapFuncReturnType<Content> | ContentType<typeof elseTemplate>;
};

type ContentType<T> = T extends CompFuncContent
  ? WrapFuncReturnType<T>
  : ComponentConfig<HTMLDivElement>;

export function renderIf<Content extends CompFuncContent, ElseContent extends CompFuncContent>(
  condition: boolean,
  content: Content,
  elseContent: ElseContent,
): WrapFuncReturnType<Content>
  | WrapFuncReturnType<ElseContent>;
export function renderIf<Content extends CompFuncContent>(
  condition: boolean,
  content: Content
): WrapFuncReturnType<Content> | ComponentConfig<HTMLDivElement>;
export function renderIf<Content extends CompFuncContent, ElseContent extends CompFuncContent>(
  condition: boolean,
  content: Content,
  elseContent?: ElseContent,
): WrapFuncReturnType<Content>
  | ContentType<typeof elseContent> {
  return condition
    ? getSignalContent(content) as WrapFuncReturnType<Content>
    : elseContent
      ? getSignalContent(elseContent) as ContentType<typeof elseContent>
      : createEl('div')().setAttribute("id", "empty_div_renderIf").addStyle({ display: "none" }) as ComponentConfig<HTMLDivElement>;
}

export function rxRenderIf<Content extends CompFuncContent, ElseContent extends CompFuncContent>(
  condition: ReactiveSignal<any> | (() => boolean),
  content: Content,
  elseContent: ElseContent,
): WrapFuncReturnType<Content> | WrapFuncReturnType<ElseContent>
export function rxRenderIf<Content extends CompFuncContent>(
  condition: ReactiveSignal<any> | (() => boolean),
  content: Content,
): WrapFuncReturnType<Content> | ComponentConfig<HTMLDivElement>
export function rxRenderIf<Content extends CompFuncContent, ElseContent extends CompFuncContent>(
  condition: ReactiveSignal<any> | (() => boolean),
  content: Content,
  elseContent?: ElseContent,
): WrapFuncReturnType<Content> | ContentType<typeof elseContent> {
  return getSignalContent(() => {
    const trueContent = content()
    const falseContent = elseContent
      ? elseContent()
      : createElement('div')
        .setAttribute("id", "empty_div_renderIf")
        .addStyle({ display: "none" })
    return condition() ? trueContent : falseContent
  }) as WrapFuncReturnType<Content> | ContentType<typeof elseContent>;
}


export function when<Content extends CompFuncContent>(
  condition: boolean | ReactiveSignal<any> | (() => boolean),
  content: Content,
): WrapFuncReturnType<Content> | ComponentConfig<HTMLDivElement>
export function when<Content extends CompFuncContent, ElseContent extends CompFuncContent>(
  condition: boolean | ReactiveSignal<any> | (() => boolean),
  content: Content,
  elseContent: ElseContent,
): WrapFuncReturnType<Content> | ContentType<typeof elseContent>
export function when<Content extends CompFuncContent, ElseContent extends CompFuncContent>(
  condition: boolean | ReactiveSignal<any> | (() => boolean),
  content: Content,
  elseContent?: ElseContent,
): WrapFuncReturnType<Content> | ContentType<typeof elseContent> {
  return typeof condition === "boolean"
    ? elseContent
      ? renderIf(
        condition, content, elseContent
      ) as WrapFuncReturnType<Content> | ContentType<typeof elseContent>
      : renderIf(
        condition, content
      ) as WrapFuncReturnType<Content> | ComponentConfig<HTMLDivElement>
    : elseContent
      ? rxRenderIf(
        condition, content, elseContent
      ) as WrapFuncReturnType<Content> | ContentType<typeof elseContent>
      : rxRenderIf(
        condition, content
      ) as WrapFuncReturnType<Content> | ComponentConfig<HTMLDivElement>;
}
