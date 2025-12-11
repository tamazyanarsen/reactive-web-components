import { ComponentConfig } from "@shared/types";
import { div } from "../html-fabric";
import { ReactiveSignal } from "../signal";
import { getSignalContent } from "./element";

function throttle<T extends unknown[]>(func: (...args: T) => void, delay: number) {
  let lastCall = 0; // Инициализируем время последнего вызова

  return (...args: T) => {
    const now = Date.now(); // Получаем текущее время

    if (now - lastCall >= delay) {
      // Если прошло достаточно времени (больше или равно задержке),
      // вызываем исходную функцию
      func(...args);
      lastCall = now; // Обновляем время последнего вызова
    }
    // В противном случае игнорируем вызов
  };
}

export const ddList = <
  Item extends Record<string, any>
>(
  items: ReactiveSignal<Item[]>,
  template: (item: Item, index: number, items: Item[]) => ComponentConfig<HTMLElement>
) => {
  return getSignalContent(() => {
    const itemsValue = items();
    let currHost: HTMLElement | null = null;
    return itemsValue.map((item, index) => div(
      {
        "@dragstart": (_e, _self, host) => {
          currHost = host;
        },
        "@dragend": (_e, _, host) => {
          host.style.transform = '';
          host.removeAttribute('draggable');
        },
        '@mousedown': (_e, _self, host) => {
          host.style.transform = 'translateZ(0)';
          host.setAttribute('draggable', 'true');
        },
        '@dragover': (e) => { e.preventDefault() },
        '@dragenter': throttle((e, _self, host) => {
          e.preventDefault();
          if (currHost) {
            let first:HTMLElement = currHost
            let second:HTMLElement = host;
            const currHostY = currHost.getClientRects().item(0)?.y ?? 0;
            const hostY = host.getClientRects().item(0)?.y ?? 0;
            if(currHostY < hostY) {
              [first, second] = [host, currHost];
            }
            // можно попробовать replaceWith с временной переменной для обмена
            host.parentElement?.insertBefore(first, second);
          }
        }, 200)
      },
      template(item, index, [...items.peek()])
    )
    )
  })
}