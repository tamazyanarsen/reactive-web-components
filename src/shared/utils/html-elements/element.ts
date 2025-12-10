import { HANDLE_SLOT_CONTEXT_NAME } from '@shared/constants/constants';
import {
	ChildrenContent,
	CompFuncContent,
	ComponentConfig,
	ComponentInitConfig,
	CustomComponentConfig,
	ExtraHTMLElement,
	HtmlTagName,
} from '../../types/element';
import { projectLog } from '../helpers';
import { effect, isReactiveSignal, ReactiveSignal, signal } from '../signal';
import {
	appendContentItem,
	elementHelpers,
	initComponent,
} from './element-helper';

export const createElement = <K extends HtmlTagName>(
	tagName: K,
	config?: ComponentInitConfig<HTMLElementTagNameMap[K]>
): ComponentConfig<HTMLElementTagNameMap[K]> => {
	const wrapper = document.createElement<K>(tagName);
	const component = elementHelpers(wrapper);
	return initComponent(new WeakRef(component), config) ?? component;
};

export const createEl = <K extends HtmlTagName>(
	tagName: `${K} ${string}` | K,
	config?: ComponentInitConfig<HTMLElementTagNameMap[K]>
) => {
	const [baseTag, ...classes] = tagName.split(' ').map((e) => e.trim());
	const element = createElement<K>(baseTag as K, config);

	if (classes.length > 0) {
		element.addClass(...classes);
	}

	return (...content: ChildrenContent<HTMLElementTagNameMap[K]>[]) => {
		return (
			appendContentItem(
				new WeakRef(element),
				...content
					.filter(Boolean)
					.flat()
					.flatMap((e) =>
						typeof e === 'function' && !isReactiveSignal(e)
							? getSignalContent(() => e(element))
							: e
					)
			) ?? element
		);
	};
};

export const getSignalContent = (cb: CompFuncContent) => {
	const effectId = `getSignalContent_${Math.random()
		.toString(36)
		.substring(2, 15)}`;
	return createElement('div')
		.addStyle({ display: 'contents' })
		.addEffect((self) => {
			self.clear();
			appendContentItem(new WeakRef(self), ...[cb()].flat());
		}, effectId);
};

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
	cb: (item: I, index: number, items: I[]) => ComponentConfig<any>
) => {
	// Создаем контейнер-обертку с display: contents для прозрачности
	const container = createElement('div').addStyle({ display: 'contents' });

	// Карта сигналов для каждого элемента (используется для принудительного обновления)
	const currItemSignalMap = new Map<I[K] | string, ReactiveSignal<string>>();

	// Карта функций создания компонентов для каждого элемента
	const currItemComponentMap = new Map<
		I[K] | string,
		() => ComponentConfig<any>
	>();

	// Карта для быстрого доступа к DOM элементам по ключу
	const domElementMap = new Map<I[K] | string, HTMLElement>();

	// Карта для кэширования индексов элементов (ключ -> индекс)
	const keyIndexMap = new Map<I[K] | string, number>();

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
		currRegisteredEffects.delete(key); // Удаляем из зарегистрированных эффектов
		currItemSignalMap.delete(key); // Удаляем сигнал элемента
		currItemComponentMap.delete(key); // Удаляем функцию создания компонента
		domElementMap.delete(key); // Удаляем DOM элемент из карты
		keyIndexMap.delete(key); // Удаляем индекс из карты
	};

	/**
	 * Получает индекс элемента по ключу (с кэшированием)
	 * @param key - Ключ элемента
	 * @returns Индекс элемента в массиве
	 */
	const getItemIndex = (key: string): number => {
		if (!keyIndexMap.has(key)) {
			const index = itemsKeyList.indexOf(key);
			keyIndexMap.set(key, index);
			return index;
		}
		return keyIndexMap.get(key)!;
	};

	/**
	 * Проверяет, нужно ли перемещать элемент в DOM
	 * @param element - DOM элемент
	 * @param targetIndex - Целевой индекс
	 * @param containerHost - Контейнер
	 * @returns true, если элемент нужно переместить
	 */
	const needsReposition = (
		element: HTMLElement,
		targetIndex: number,
		containerHost: HTMLElement
	): boolean => {
		const currentIndex = Array.from(containerHost.children).indexOf(element);
		return currentIndex !== targetIndex;
	};

	// Основной эффект, который отслеживает изменения в массиве items
	effect(() => {
		// Получаем новый массив элементов
		const newItems = items();

		// Создаем список ключей из нового массива, преобразуя все в строки
		const newItemsKeyList = newItems
			.map(keyFn) // Применяем функцию получения ключа
			.map((e) => (typeof e === 'string' ? e : e.toString())); // Преобразуем в строки

		// Создаем Set для быстрой проверки наличия ключа
		const newItemsKeySet = new Set(newItemsKeyList);

		// Обновляем кэш индексов
		keyIndexMap.clear();
		newItemsKeyList.forEach((key, index) => {
			keyIndexMap.set(key, index);
		});

		itemsKeyList = newItemsKeyList;

		const containerHost = container.hostElement;
		if (!containerHost) return;

		projectLog('containerChildren', Array.from(containerHost.children), itemsKeyList);

		// Удаляем элементы, которых больше нет в новом списке
		// Используем обратный порядок для безопасного удаления
		const childrenToRemove: HTMLElement[] = [];
		Array.from(containerHost.children).forEach((e) => {
			const key = (e as HTMLElement).dataset.key as string;
			if (key && !newItemsKeySet.has(key)) {
				childrenToRemove.push(e as HTMLElement);
			}
		});

		// Удаляем элементы только если они действительно отсутствуют в новом списке
		childrenToRemove.forEach((e) => {
			const key = e.dataset.key as string;
			projectLog('remove element', key, e);
			e.remove(); // Удаляем элемент из DOM
			deleteKey(key); // Очищаем связанные данные
		});

		// Обрабатываем каждый элемент из нового списка
		newItemsKeyList.forEach((key, index) => {
			const currItem = newItems[index]; // Используем индекс напрямую
			const oldItem = oldItems[index];

			// Если это новый элемент (нет в карте сигналов)
			if (!currItemSignalMap.has(key)) {
				projectLog('create new element', key, currItem);

				// Создаем новый сигнал с случайным значением для принудительного обновления
				currItemSignalMap.set(
					key,
					signal(Math.random().toString(36).substring(2, 15))
				);

				// Создаем функцию для генерации компонента с data-key атрибутом
				currItemComponentMap.set(key, () =>
					cb(currItem, index, newItems).setCustomAttribute('data-key', key)
				);
			}
			// Если элемент существует, но изменился (сравниваем JSON)
			else if (oldItem && JSON.stringify(currItem) !== JSON.stringify(oldItem)) {
				// Получаем существующий DOM элемент из карты
				const existingElement = domElementMap.get(key);

				// Обновляем сигнал новым случайным значением для принудительного обновления
				currItemSignalMap
					.get(key)
					?.set(Math.random().toString(36).substring(2, 15));

				// Обновляем функцию создания компонента с новыми данными
				currItemComponentMap.set(key, () =>
					cb(currItem, index, newItems).setCustomAttribute('data-key', key)
				);

				// Если элемент существует в DOM, используем replaceWith для плавного обновления
				if (existingElement && existingElement.parentNode) {
					// Помечаем элемент для замены, но не удаляем сразу
					// Замена произойдет в эффекте рендеринга через replaceWith
					projectLog('mark element for update', key);
				}
			}
		});

		// Сохраняем текущее состояние как старое для следующего сравнения
		oldItems = [...newItems.map((item) => ({ ...item }))];

		/**
		 * Создает эффекты для рендеринга элементов
		 * Выполняется асинхронно для корректной работы с DOM
		 */
		const createEffect = () => {
			// Проходим по всем элементам в карте сигналов
			currItemSignalMap.forEach((signalTrigger, key) => {
				projectLog(
					'key from setTimeout foreach currItemSignalMap',
					key
				);

				// Если эффект еще не зарегистрирован для этого ключа
				if (!currRegisteredEffects.has(key)) {
					currRegisteredEffects.add(key); // Помечаем как зарегистрированный

					// Создаем эффект для рендеринга элемента
					effect(() => {
						signalTrigger(); // Читаем сигнал для подписки на изменения

						const itemIndex = getItemIndex(key); // Получаем индекс элемента (с кэшированием)
						const currComponent = currItemComponentMap.get(key)?.(); // Создаем компонент

						if (!currComponent || !currComponent.hostElement) return; // Если компонент не создался, выходим

						const containerHost = container.hostElement;
						const currComponentHost = currComponent.hostElement;

						if (!containerHost) return;

						projectLog(
							'call effect from setTimeout',
							key,
							currComponentHost
						);

						// Получаем существующий элемент из карты
						const existingElement = domElementMap.get(key);

						// Если элемент уже существует в DOM
						if (existingElement && existingElement.parentNode === containerHost) {
							// Проверяем, нужно ли переместить элемент
							if (needsReposition(existingElement, itemIndex, containerHost)) {
								// Перемещаем элемент на правильную позицию
								const targetChild = containerHost.children[itemIndex];
								if (targetChild && targetChild !== existingElement) {
									containerHost.insertBefore(existingElement, targetChild);
								} else if (!targetChild) {
									// Если целевой позиции нет, добавляем в конец
									containerHost.appendChild(existingElement);
								}
							}

							// Если элемент изменился, заменяем его через replaceWith
							if (currComponentHost !== existingElement) {
								existingElement.replaceWith(currComponentHost);
								domElementMap.set(key, currComponentHost);
							}
						} else {
							// Элемент не существует в DOM, вставляем его
							domElementMap.set(key, currComponentHost);

							// Вставляем элемент в правильную позицию
							if (itemIndex < containerHost.children.length) {
								// Если позиция в пределах существующих элементов - вставляем перед элементом в этой позиции
								const targetChild = containerHost.children[itemIndex];
								if (targetChild) {
									containerHost.insertBefore(currComponentHost, targetChild);
								} else {
									containerHost.appendChild(currComponentHost);
								}
							} else {
								// Если позиция за пределами - добавляем в конец
								containerHost.appendChild(currComponentHost);
							}
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
		| Array<ComponentConfig<T> | CustomComponentConfig<T>>
>(
	cb: () => R
): R => {
	let currComponent = [createElement('div')];
	let isMulti = false;
	effect(() => {
		const reactiveComponent = cb();
		isMulti = Array.isArray(reactiveComponent);
		const newReactiveComponent: ComponentConfig<any>[] = [];
		newReactiveComponent.push(...[reactiveComponent].flat());
		if (newReactiveComponent.length === 0) {
			newReactiveComponent.push(
				createElement('div')
					.addStyle({ display: 'none' })
					.setAttribute('id', 'empty_template') as any
			);
		}
		try {
			projectLog(
				'newReactiveComponent.map',
				newReactiveComponent.map((e) => {
					projectLog(
						'newReactiveComponent hostElement',
						e.hostElement
					);
					return e.hostElement?.id;
				})
			);
			projectLog(
				'currComponent[0].hostElement?.id',
				currComponent[0].hostElement?.id,
				currComponent
			);
			currComponent[0].hostElement?.replaceWith(
				...newReactiveComponent
					.map((e) => e.hostElement)
					.filter(Boolean)
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
	const template = createEl('div')().addStyle({ display: 'contents' });
	const setHtml = (htmlString: string) => {
		const templateHost = template.hostElement;
		if (templateHost) {
			templateHost.innerHTML = htmlString;
		}
		return template;
	};
	if (typeof html === 'string') {
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
	elseContent?: CompFuncContent
) =>
	condition
		? getSignalContent(content)
		: elseContent
		? getSignalContent(elseContent)
		: createEl('div')()
				.setAttribute('id', 'empty_div_renderIf')
				.addStyle({ display: 'none' });

export const rxRenderIf = (
	condition: ReactiveSignal<any> | (() => boolean),
	content: CompFuncContent,
	elseContent?: CompFuncContent
) =>
	getSignalContent(() =>
		renderIf(Boolean(condition()), content, elseContent)
	);

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
	elseContent?: CompFuncContent
) =>
	typeof condition === 'boolean'
		? renderIf(condition, content, elseContent)
		: rxRenderIf(condition, content, elseContent);

export const showIf = (
	condition: boolean | ReactiveSignal<any> | (() => boolean),
	template: CompFuncContent
) => {
	return getSignalContent(template).addEffect((_, host) => {
		if (typeof condition === 'boolean') {
			host.style.display = condition ? 'block' : 'none';
		} else {
			const conditionRes = condition() ? 'block' : 'none';
			host.style.display = conditionRes;
		}
	});
};

export const show = (
	condition: boolean | ReactiveSignal<any> | (() => boolean),
	template: CompFuncContent,
	elseTemplate?: CompFuncContent
) => {
	const templates: ComponentConfig<any>[] = [
		showIf(condition, template),
	].flat();
	if (elseTemplate) {
		templates.push(
			...[
				showIf(
					() =>
						typeof condition === 'boolean'
							? !condition
							: !condition(),
					elseTemplate
				),
			].flat()
		);
	}
	return getSignalContent(() => templates);
};
