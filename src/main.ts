import { ComponentConfig } from "@shared/types";
import "./style.css";

import {
  BaseElement,
  component,
  ddList,
  div,
  effect,
  newGetList,
  property,
  signal,
  slot,
  useCustomComponent,
  when,
} from "@shared/utils";

const appendToBody = (element: ComponentConfig<any>) => {
  const hostValue = element.hostElement;
  if (!hostValue) return;
  document.body.append(hostValue);
};

// const formViewModel = signal({
//   name: '',
//   email: '',
//   password: '',
// }).setName('formViewModel')

const Test2 = useCustomComponent(
  class extends BaseElement {
    render() {
      return div("test2", slot());
    }
  },
  "app-test2",
);

const testSignal = signal(1);
console.log("testSignal", testSignal);
setTimeout(() => {
  testSignal.set(2);
  setTimeout(() => {
    testSignal.set(3);
  }, 2000);
}, 2000);

@component("app-test1")
export class TestComponent extends BaseElement {
  @property()
  test = signal(0);

  test1 = effect(() => {
    console.log("test1", this.test());
  });
  connectedCallback() {
    setTimeout(() => {
      console.log("connectedCallback", this.test.peek());
      this.test.set(1000);
    }, 6000);
  }

  render() {
    return div(
      "test",
      () => Test2(this.test().toString(), testSignal().toString()),
      when(
        () => testSignal() < 3,
        () =>
          when(
            () => testSignal() % 2 === 0,
            () => div("test-even"),
            () => div("test-odd"),
          ),
        () => div("test-default"),
      ),
    );
  }
}
const Test = useCustomComponent(TestComponent);

appendToBody(Test());

// Пример drag&drop списка с использованием getList для избежания перерисовки всего списка

const itemsSignal = signal([
  { id: 1, value: "Item 1", color: "#f44336" },
  { id: 2, value: "Item 2", color: "#4caf50" },
  { id: 3, value: "Item 3", color: "#2196f3" },
  { id: 4, value: "Item 4", color: "#ff9800" },
]).setName("dndItems");

appendToBody(
  useCustomComponent(
    class extends BaseElement {
      render() {
        return div(
          "test-dnd",
          ddList(itemsSignal, (item) => div(item.value)),
        );
      }
    },
    "test-dnd",
  )(),
);

// Примеры использования newGetList

// Пример 1: Простой список задач с использованием newGetList
const todosSignal = signal([
  { id: "1", text: "Купить молоко", completed: false },
  { id: "2", text: "Выучить TypeScript", completed: true },
  { id: "3", text: "Создать компонент", completed: false },
]).setName("todos");

appendToBody(
  useCustomComponent(
    class extends BaseElement {
      render() {
        return div(
          "todos-list",
          newGetList(
            todosSignal,
            (item) => item.id, // ключ - id элемента
            (item, index) =>
              div(
                {
                  classList: [`todo-item-${item.id}`],
                  style: {
                    textDecoration: item.completed ? "line-through" : "none",
                    padding: "8px",
                    margin: "4px",
                    border: "1px solid #ccc",
                  },
                },
                `${index + 1}. ${item.text}`,
              ),
          ),
        );
      }
    },
    "app-todos",
  )(),
);

const colorSignal = signal("red");
// Пример 2: Список с цветными элементами и динамическим обновлением
const coloredItemsSignal = signal([
  { id: 1, name: "Красный", color: colorSignal },
  { id: 2, name: "Зеленый", color: colorSignal },
  { id: 3, name: "Синий", color: colorSignal },
]).setName("coloredItems");

appendToBody(
  useCustomComponent(
    class extends BaseElement {
      render() {
        return div(
          "colored-list",
          newGetList(
            coloredItemsSignal,
            (item) => item.id.toString(), // ключ - строковое представление id
            (item, index, items) =>
              div(
                {
                  classList: [`colored-item-${item.id}`],
                  style: {
                    backgroundColor: item.color,
                    color: "white",
                    padding: "12px",
                    margin: "8px",
                    borderRadius: "4px",
                  },
                },
                `${item.name} (${index + 1}/${items.length})`,
              ),
          ),
        );
      }
    },
    "app-colored-list",
  )(),
);

// Пример 3: Использование с существующим itemsSignal
appendToBody(
  useCustomComponent(
    class extends BaseElement {
      render() {
        return div(
          "new-get-list-example",
          newGetList(
            itemsSignal,
            (item) => item.id, // ключ по id
            (item) =>
              div(
                {
                  classList: [`item-${item.id}`],
                  style: {
                    backgroundColor: item.color,
                    padding: "10px",
                    margin: "5px",
                    borderRadius: "4px",
                    color: "white",
                  },
                },
                `${item.value} (ID: ${item.id})`,
              ),
          ),
        );
      }
    },
    "app-new-get-list",
  )(),
);

// Демонстрация динамического обновления списка
setTimeout(() => {
  // Добавляем новый элемент в todos
  todosSignal.set([
    ...todosSignal.peek(),
    { id: "4", text: "Протестировать newGetList", completed: false },
  ]);

  // Обновляем элемент в coloredItems
  coloredItemsSignal.set([
    { ...coloredItemsSignal.peek()[0], id: 1, name: "Красный 2" },
    ...coloredItemsSignal.peek().slice(1),
  ]);
  console.log("coloredItemsSignal updated");
}, 3000);

setTimeout(() => {
  // coloredItemsSignal.set([
  //   {
  //     id: 3,
  //     name: "Красный" + Math.random().toString(36).substring(2, 15),
  //     color: "red",
  //   },
  //   {
  //     id: 2,
  //     name: "Зеленый (обновлен)" + Math.random().toString(36).substring(2, 15),
  //     color: "green",
  //   },
  //   { id: 1, name: "Синий", color: "blue" },
  //   { id: 4, name: "Желтый", color: "yellow" },
  // ]);
  //
  colorSignal.set("orange");
  console.log("coloredItemsSignal updated");
}, 6000);

