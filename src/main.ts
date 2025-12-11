import { ComponentConfig } from "@shared/types";
import "./style.css";

import { BaseElement, component, ddList, div, effect, property, signal, slot, useCustomComponent, when } from "@shared/utils";

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

// Пример drag&drop списка с использованием getList для избежания перерисовки всего списка

const itemsSignal = signal([
  { id: 1, value: 'Item 1', color: '#f44336' },
  { id: 2, value: 'Item 2', color: '#4caf50' },
  { id: 3, value: 'Item 3', color: '#2196f3' },
  { id: 4, value: 'Item 4', color: '#ff9800' }
]).setName('dndItems')


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

