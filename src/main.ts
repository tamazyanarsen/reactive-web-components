import { webLightTheme } from '@fluentui/tokens';
import { setTheme } from '@fluentui/web-components';
setTheme(webLightTheme);

import './style.css';

export * from './components';
export * from './fluent-components';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <p>веб-компоненты</p>
    <div class="component-wrapper">
      <rx-input id="inp1"></rx-input>
      <rx-input></rx-input>
      <rx-input></rx-input>
      <rx-button type="primary">sdlflkjsdlfjslfkjlj</rx-button>
      <rx-button type="warning">sdlflkjsdlfjslfkjlj</rx-button>
      <rx-button type="info">sdlflkjsdlfjslfkjlj</rx-button>
      <rx-test></rx-test>
      <rx-select></rx-select>
      <rx-select is-multi="true"></rx-select>

      <fluent-select></fluent-select>
    </div>
  </div>
`;

document.querySelector('rx-button')?.addEventListener('change', console.log)
const selectEl = document.querySelectorAll('rx-select')
setTimeout(() => {
  selectEl.forEach(el => {
    el.setAttribute('options', JSON.stringify([
      { label: 'first item', value: 1 },
      { label: 'second item', value: 2 },
      { label: 'third item', value: 3 },
    ]))
    el.addEventListener('change', console.log)
  })
}, 2000);

document.querySelectorAll('fluent-select').forEach(elem => {
  elem.setAttribute('items', JSON.stringify([
    { label: 'first item', value: 1 },
    { label: 'second item', value: 2 },
    { label: 'third item', value: 3 },
  ]))
})
