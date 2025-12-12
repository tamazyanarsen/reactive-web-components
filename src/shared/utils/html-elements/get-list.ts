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
  const currElementsMap = new Map<number, WeakRef<HTMLElement>>();

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

    container.hostElement?.childNodes.forEach((node, index) => {
      if (node instanceof HTMLElement && node.dataset.key) {
        currElementsMap.set(index, new WeakRef(node));
      }
    });

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
      if (itemsKey.includes(key)) return;
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
          const { templateFunc, items, itemsKey, index } =
            signalMap.get(key)?.() ?? {};
          console.log(templateFunc, itemsKey, items, index);
          container.hostElement?.childNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              if (node.getAttribute("data-key") === key) {
              }
            }
          });
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

    newItemsKey.forEach((key, index) => {
      if (itemsKey.includes(key)) {
        console.log(
          "find element",
          key,
          itemsValue[itemsKey.indexOf(key)],
          newItems[index],
        );
        if (
          JSON.stringify(itemsValue[itemsKey.indexOf(key)]) !==
          JSON.stringify(newItems[index])
        ) {
          itemKeyComponentMap.set(key, () =>
            cb(newItems[index], index, newItems).setCustomAttribute(
              "data-key",
              key,
            ),
          );
          console.log(
            "update element",
            key,
            itemsValue[itemsKey.indexOf(key)],
            newItems[index],
          );
          container.hostElement
            ?.querySelector(`[data-key="${key}"]`)
            ?.replaceWith(
              itemKeyComponentMap.get(key)?.().hostElement ??
                document.createElement("div"),
            );
        }
        if (itemsKey.indexOf(key) !== index) {
          console.log(
            "insert element",
            key,
            itemsValue[itemsKey.indexOf(key)],
            newItems[index],
          );
          insertElement(
            index,
            container.hostElement,
            container.hostElement?.querySelector(`[data-key="${key}"]`),
          );
        }
      } else {
        console.log("new element", key, newItems[index]);
        insertElement(
          index,
          container.hostElement,
          itemKeyComponentMap.get(key)?.().hostElement,
        );
      }
    });

    itemsKey = newItemsKey;
    itemsValue = [...newItems];
  });

  return container;
};

