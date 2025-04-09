import "./style.css";

export * from './test/select'

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <p>веб-компоненты</p>
    <rx-select></rx-select>
  </div>
`;

document.querySelectorAll("rx-select").forEach((elem) => {
  elem.setAttribute(
    "items",
    JSON.stringify([
      { label: "first item", value: 1 },
      { label: "second item", value: 2 },
      { label: "third item", value: 3 },
    ]),
  );
});


