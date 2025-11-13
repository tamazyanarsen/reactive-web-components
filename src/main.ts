import "./style.css";

import "./test-components/tab-bar";

import './test-components/examples/counter';
import './test-components/examples/test-list/dynamic-items-test';
import './test-components/examples/test-list/example.list';

import './test-components/examples/button/button';

setTimeout(() => {
  document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <p>веб-компоненты</p>
    
    <button-test></button-test>
  </div>
`;
}, 3000);

// <example-list-test></example-list-test>
// <dynamic-test-demo></dynamic-test-demo>

// const sig1 = signal(Math.random() + 1);
// const sig2 = signal(Math.random() + 2);
// effect(()=>{
//   console.log('sig1', sig1())
//   effect(()=>{
//     console.log('sig2', sig2())
//     // effect(()=>{
//     //   console.log('sig2', sig2())
//     // })
//   })
// })

// const timer = setInterval(() => {
//   sig1.set(Math.random() + 1);
//   // sig2.set(Math.random());
// }, 100);
// setTimeout(() => {
//   clearInterval(timer);
// }, 10000);

// const testList = document.querySelectorAll('.item') as unknown as (HTMLElement & { handleSlotContext: (value: any) => void })[];

// testList.forEach(item => {
//   setTimeout(() => {
//     // item.handleSlotContext((value: { id: number, name: string }) => {
//     //   console.log('handleSlotContext value', value)
//     // })
//   }, 1000);
//   item.addEventListener('handleSlotContext', (e: Event) => {
//     console.log('handleSlotContext value', (e as CustomEvent).detail)
//   })
// })

// <test-counter></test-counter>
// <example-list>
//   <div slot="item" class="item">
//   </div>
//   <div slot="item" class="item">
//   </div>
// </example-list>
// <example-list-test></example-list-test>
// <tab-bar></tab-bar>
