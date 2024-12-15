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
    </div>
  </div>
`
