import './style.css';

export * from './components';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <p>веб-компоненты</p>
    <div>
      <t1-input></t1-input>
      <t1-button></t1-button>
    </div>
  </div>
`
