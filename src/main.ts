import './style.css';

export * from './components';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <p>веб-компоненты</p>
    <div class="component-wrapper">
      <rx-input></rx-input>
      <rx-button></rx-button>
    </div>
  </div>
`
