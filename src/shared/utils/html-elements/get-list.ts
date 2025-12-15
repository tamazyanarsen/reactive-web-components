import { ComponentConfig } from "@shared/types";
import { ReactiveSignal, effect, signal } from "../signal";
import { createElement } from "./element";

export const newGetList = <I extends Record<string, any>, K extends keyof I>(
  items: ReactiveSignal<I[]>,
  keyFn: (item: I) => I[K] | string,
  cb: (item: I, index: number, items: I[]) => ComponentConfig<HTMLElement>,
) => {
  console.log("newGetList", items.peek(), keyFn, cb);
  let itemsValue: I[] = [];
  let itemsKey: (I[K] | string)[] = [];
  const container = createElement("div");
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

    console.log("start getlist");

    itemsKey
      .filter((key) => !newItemsKey.includes(key))
      .forEach((key) => {
        itemKeyComponentMap.delete(key);
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
        console.log("key was found", key);
        if (
          JSON.stringify(itemsValue[itemsKey.indexOf(key)]) !==
          JSON.stringify(newItems[index])
        ) {
          console.log("items not equal");
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
      console.log("start queueMicrotask");
      queueMicrotask(() => {
        effect(() => {
          const { templateFunc, items, itemsKey, index } =
            signalMap.get(key)?.() ?? {};
          console.log(templateFunc, itemsKey, items, index);
          const findElement = container.hostElement?.querySelector(
            `[data-key="${key}"]`,
          );
          const newElement =
            templateFunc?.().setCustomAttribute("data-key", key).hostElement ??
            document.createElement("div");
          if (!findElement) {
            console.log("find element", findElement);
            insertElement(index ?? 0, container.hostElement, newElement);
          } else {
            console.log("NOT find element");
            container.hostElement?.childNodes.forEach((node, oldIndex) => {
              if (node instanceof HTMLElement) {
                if (node.getAttribute("data-key") === key) {
                  if (index === oldIndex) {
                    console.log("start replaceWith", key, index, newElement);
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
      console.log("insertElement", index, parent, el);
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

