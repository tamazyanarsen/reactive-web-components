import { createEffectScope, type EffectScope } from "../src/shared/components/utils/render-context";

/**
 * Скоуп + контейнер в документе: имитирует то, что делает компонент вокруг render().
 * Без контейнера в документе узлы блоков остаются во фрагменте и порядок не проверить.
 */
export const mountScope = () => {
  const container = document.createElement("div");
  document.body.append(container);

  const scope: EffectScope = createEffectScope();

  return {
    container,
    /** Собирает разметку в скоупе и вставляет её в контейнер. */
    render: (build: () => Node) => {
      container.append(scope.run(build));
      return container;
    },
    dispose: () => {
      scope.dispose();
      container.remove();
    },
  };
};

/** Текст контейнера без комментариев-якорей. */
export const textOf = (element: Element) => element.textContent ?? "";

/** Теги и текст детей верхнего уровня — чтобы проверять порядок узлов. */
export const childrenOf = (element: Element) =>
  [...element.childNodes]
    .filter((node) => node.nodeType !== Node.COMMENT_NODE)
    .map((node) => node.textContent ?? "");

/**
 * Ждёт микрозадачи: уборка отключённого компонента отложена на них, чтобы перемещение
 * по DOM не пересоздавало компонент.
 */
export const flushMicrotasks = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
