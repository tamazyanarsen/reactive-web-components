import { ComponentConfig } from "@shared/types";
import { ReactiveSignal, effect, signal } from "../signal";
import { createElement } from "./element";

export const getList = <I extends Record<string, any>, K extends keyof I>(
  items: ReactiveSignal<I[]>,
  keyFn: (item: I) => I[K] | string,
  cb: (item: I, index: number, items: I[]) => ComponentConfig<HTMLElement>,
) => {
  let itemsValue: I[] = [];
  let itemsKey: (I[K] | string)[] = [];
  const container = createElement("div").addStyle({ display: "contents" });
  const itemKeyComponentMap = new Map<
    ReturnType<typeof keyFn>,
    () => ComponentConfig<HTMLElement>
  >();

  const signalMap = new Map<
    string,
    ReactiveSignal<{
      templateFunc: () => ReturnType<typeof cb>;
      items: I[];
      itemsKey: string[];
      index: number;
    }>
  >();

  effect(() => {
    const newItems = items();
    const newItemsKey = newItems.map(keyFn);

    itemsKey
      .filter((key) => !newItemsKey.includes(key))
      .forEach((key) => {
        itemKeyComponentMap.delete(key);
        signalMap.delete(key);
        container.hostElement?.querySelector(`[data-key="${key}"]`)?.remove();
      });

    newItemsKey.forEach((key, index) => {
      if (itemsKey.includes(key)) return;
      itemKeyComponentMap.set(key, () =>
        cb(newItems[index], index, newItems).setCustomAttribute(
          "data-key",
          key,
        ),
      );
    });

    newItemsKey.forEach((key, index) => {
      if (itemsKey.includes(key)) {
        if (
          JSON.stringify(itemsValue[itemsKey.indexOf(key)]) !==
          JSON.stringify(newItems[index])
        ) {
          signalMap.get(key)?.set({
            templateFunc: () => cb(newItems[index], index, newItems),
            items: newItems,
            itemsKey: newItemsKey,
            index,
          });
        }
        return;
      }
      signalMap.set(
        key,
        signal({
          templateFunc: () => cb(newItems[index], index, newItems),
          items: newItems,
          itemsKey: newItemsKey,
          index,
        }),
      );
      queueMicrotask(() => {
        effect(() => {
          const { templateFunc, index } = signalMap.get(key)?.() ?? {};
          const findElement = container.hostElement?.querySelector(
            `[data-key="${key}"]`,
          );
          const newElement =
            templateFunc?.().setCustomAttribute("data-key", key).hostElement ??
            document.createElement("div");
          if (!findElement) {
            insertElement(index ?? 0, container.hostElement, newElement);
          } else {
            container.hostElement?.childNodes.forEach((node, oldIndex) => {
              if (node instanceof HTMLElement) {
                if (node.getAttribute("data-key") === key) {
                  if (index === oldIndex) {
                    insertElement(
                      index ?? 0,
                      container.hostElement,
                      newElement,
                    );
                    node.remove();
                  } else {
                    insertElement(
                      index ?? 0,
                      container.hostElement,
                      newElement,
                    );
                  }
                }
              }
            });
          }
        });
      });
    });

    const insertElement = (
      index: number,
      parent?: HTMLElement,
      el?: HTMLElement | null,
    ) => {
      if (!(el && parent)) return;

      if (index < parent.children.length) {
        parent.insertBefore(el, parent.children[index]);
      } else {
        parent.appendChild(el);
      }
    };

    itemsKey = newItemsKey;
    itemsValue = [...newItems];
  });

  return container;
};
