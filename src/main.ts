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
      <rx-select></rx-select>
    </div>
  </div>
`;

document.querySelector('rx-button')?.addEventListener('change', console.log)
const selectEl = document.querySelector('rx-select')
setTimeout(() => {
  selectEl?.setAttribute('options', JSON.stringify([
    { label: 'first item', value: 1 },
    { label: 'second item', value: 2 },
    { label: 'third item', value: 3 },
  ]))
}, 2000);
setTimeout(() => {
  selectEl?.setAttribute('is-multi', 'true')
}, 3000);
setTimeout(() => {
  selectEl?.removeAttribute('is-multi')
}, 5000);
selectEl?.addEventListener('change', console.log)

