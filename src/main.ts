// import { webLightTheme } from '@fluentui/tokens';
// import { FluentDesignSystem, MenuItemDefinition, MenuListDefinition, setTheme } from '@fluentui/web-components';
// setTheme(webLightTheme);
// // start register fluent component
// MenuItemDefinition.define(FluentDesignSystem.registry)
// MenuListDefinition.define(FluentDesignSystem.registry)
// // stop register fluent components

import './style.css';

export * from './components';

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

      <rx-base-select></rx-base-select>
      <rx-base-select is-multi="true"></rx-base-select>

      <rx-select></rx-select>
      <rx-select is-multi="false"></rx-select>

      <rx-switch label="Видно всем"></rx-switch>
      <rx-switch label="Видно всем" is-selected="true"></rx-switch>
    </div>
  </div>
`;

document.querySelector('rx-button')?.addEventListener('change', console.log)
const selectEl = document.querySelectorAll('rx-base-select')
setTimeout(() => {
  selectEl.forEach(el => {
    el.setAttribute('options', JSON.stringify([
      { label: 'first item', value: 1 },
      { label: 'second item', value: 2 },
      { label: 'third item', value: 3 },
    ]))
    el.addEventListener('change', console.log)
  })
}, 200);

document.querySelectorAll('rx-select').forEach(elem => {
  elem.setAttribute('items', JSON.stringify([
    { label: 'first item', value: 1 },
    { label: 'second item', value: 2 },
    { label: 'third item', value: 3 },
  ]))
})
