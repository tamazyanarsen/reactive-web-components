import { ComponentConfig } from "@shared/types";
import "./style.css";

import { BaseElement, component, div, effect, getSignalContent, property, ReactiveSignal, signal, slot, useCustomComponent, when } from "@shared/utils";

const appendToBody = (element: ComponentConfig<any>) => {
  const hostValue = element.hostElement;
  if (!hostValue) return;
  document.body.append(hostValue);
}

// const formViewModel = signal({
//   name: '',
//   email: '',
//   password: '',
// }).setName('formViewModel')

const Test2 = useCustomComponent(class extends BaseElement {
  render() {
    return div('test2', slot())
  }
}, 'app-test2')

const testSignal = signal(1);
console.log('testSignal', testSignal)
setTimeout(() => {
  testSignal.set(2);
  setTimeout(() => {
    testSignal.set(3);
  }, 2000);
}, 2000);

@component('app-test1')
export class TestComponent extends BaseElement {
  @property()
  test = signal(0)

  test1 = effect(() => {
    console.log('test1', this.test())
  })
  connectedCallback() {
    setTimeout(() => {
      console.log('connectedCallback', this.test.peek())
      this.test.set(1000)
    }, 6000);
  }

  render() {
    return div('test', () => Test2(this.test().toString(), testSignal().toString()),
      when(
        () => testSignal() < 3,
        () => when(() => testSignal() % 2 === 0, () => div('test-even'), () => div('test-odd')),
        () => div('test-default')
      )
    )
  }
}
const Test = useCustomComponent(TestComponent)

appendToBody(Test())

export const debounce = <T>(fn: (...args: T[]) => void, delay: number) => {
  let timeout: NodeJS.Timeout;
  const debounced = (...args: T[]): void => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
  debounced.cancel = (): void => {
    clearTimeout(timeout);
  };
  return debounced;
};

export function throttle<T extends unknown[]>(func: (...args: T) => void, delay: number) {
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

// Пример drag&drop списка с использованием getList для избежания перерисовки всего списка

const itemsSignal = signal([
  { id: 1, value: 'Item 1', color: '#f44336' },
  { id: 2, value: 'Item 2', color: '#4caf50' },
  { id: 3, value: 'Item 3', color: '#2196f3' },
  { id: 4, value: 'Item 4', color: '#ff9800' }
]).setName('dndItems')


export const ddList = <
  Item extends Record<string, any>
>(
  items: ReactiveSignal<Item[]>,
  template: (item: Item, index: number, items: Item[]) => ComponentConfig<HTMLElement>
) => {
  return getSignalContent(() => {
    const itemsValue = items();
    // const itemsKey = itemsValue.map(keyFn);
    let currHost: HTMLElement | null = null;
    return itemsValue.map((item, index) => div(
      {
        "@dragstart": (e, _self, host) => {
          console.log('dragstart', e)
          currHost = host;
        },
        "@dragend": (_e, _, host) => {
          console.log('dragend curr items', host)
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

appendToBody(useCustomComponent(class extends BaseElement {
  render() {
    return div(
      'test-dnd', ddList(
        itemsSignal,
        (item) => div(item.value)
      )
    )
  }
}, 'test-dnd')())

