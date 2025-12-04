import "./style.css";

import { BaseElement, combineLatest, component, div, effect, property, signal, when } from "@shared/utils";

const testSignal = signal(false)

document.body.append(
  div(
    { '.id': 'main container div' },
    when(testSignal, () => div('true')),
    when(testSignal, () => div('true')),
  ).hostElement
);

combineLatest(signal(1), signal('123123')).pipe(data => data)

const formViewModel = signal({
  name: '',
  email: '',
  password: '',
}).setName('formViewModel')

effect(() => {
  effect(() => {
    console.log(formViewModel.pipe(data => data.name).setName('formViewModel.name')())
  })
  setTimeout(() => {
    formViewModel.set({
      name: 'test',
      email: 'test@test.com',
      password: 'test',
    })
  }, 2000);
})

@component('app-test1')
export class Test extends BaseElement {
  @property()
  test = signal(0)
  render() {
    // здесь эффект не создается заново, здесь перевызывается тот же эффект без какого-либо родительского эффекта
    // а старый div(this.test().toString()) становится detached
    return div('test', ()=> div(this.test().toString()))
  }
}