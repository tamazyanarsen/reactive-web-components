import { ComponentConfig } from "@shared/types";
import "./style.css";

import { BaseElement, component, div, effect, property, signal, slot, useCustomComponent } from "@shared/utils";

const appendToBody = (element: ComponentConfig<any>) => {
  document.body.append(element.hostElement);
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
    // здесь эффект не создается заново, здесь перевызывается тот же эффект без какого-либо родительского эффекта
    // а старый div(this.test().toString()) становится detached
    return div('test', () => Test2(this.test().toString(), testSignal().toString()))
  }
}
const Test = useCustomComponent(TestComponent)

appendToBody(Test())