/**
 * Живой поиск: resource, дебаунс и отмена устаревшего ответа.
 *
 * Весь асинхронный код — один fetcher. Сигналы, прочитанные в нём, становятся
 * зависимостями, поэтому новый ввод сам запускает новый запрос. Предыдущий при этом
 * получает abort, а его ответ игнорируется — старый результат не может перезаписать
 * свежий.
 *
 * Дебаунс тоже живёт внутри fetcher: сначала ждём паузу, и только потом идём в сеть.
 * Раз отмена гасит и ожидание, промежуточные запросы вообще не уходят — это видно
 * по счётчику запросов на странице.
 *
 * Состояния (пусто / грузим / ничего не нашли / список) переключает dynamic:
 * это узел, который пересобирается при изменении прочитанных прямо в нём сигналов.
 */
import {
  defineComponent,
  payload,
  useCustomComponent,
} from "../src/shared/components/custom/custom-element";
import {
  cls,
  computed,
  css,
  div,
  dynamic,
  each,
  input,
  li,
  resource,
  span,
  ul,
} from "../src/shared/components/html";
import { signal } from "../src/shared/signals";
import { BASE_CSS, type Example } from "./shared";

const CSS = css`
  .field { width: 100%; }
  .results { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 6px; }
  .person {
    display: flex; align-items: baseline; gap: 10px; width: 100%; text-align: left;
    background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px;
  }
  .person .name { font-weight: 600; }
  .person .role { color: var(--muted); font-size: 13px; }
  .person .city { margin-left: auto; color: var(--muted); font-size: 13px; }
  .note.loading { color: var(--accent); border-style: solid; }
`;

export type Person = { id: number; name: string; role: string; city: string };

const DIRECTORY: readonly Person[] = [
  { id: 1, name: "Ирина Соколова", role: "фронтенд", city: "Тбилиси" },
  { id: 2, name: "Павел Гринёв", role: "бэкенд", city: "Ереван" },
  { id: 3, name: "Дана Аскарова", role: "дизайн", city: "Алматы" },
  { id: 4, name: "Марк Левин", role: "фронтенд", city: "Белград" },
  { id: 5, name: "Аня Ким", role: "аналитика", city: "Тбилиси" },
  { id: 6, name: "Тимур Раев", role: "девопс", city: "Ереван" },
  { id: 7, name: "Ольга Пак", role: "дизайн", city: "Лиссабон" },
];

/** Сколько запросов реально ушло — по этому числу видно работу дебаунса. */
export const requestCount = signal(0);

/** Пауза, которую можно отменить: на abort таймер снимается, промise отклоняется. */
const wait = (ms: number, abort: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timerId = setTimeout(resolve, ms);
    abort.addEventListener(
      "abort",
      () => {
        clearTimeout(timerId);
        reject(abort.reason);
      },
      { once: true },
    );
  });

/** Имитация сети: та же задержка и та же гонка ответов, что и у настоящего запроса. */
const fetchPeople = (query: string) =>
  new Promise<Person[]>((resolve) => {
    requestCount.update((count) => count + 1);
    const needle = query.toLowerCase();
    const found = DIRECTORY.filter((person) =>
      `${person.name} ${person.role} ${person.city}`.toLowerCase().includes(needle),
    );
    // Разброс задержки нужен, чтобы ответы приходили не в том порядке, в каком ушли.
    setTimeout(() => resolve(found), 250 + Math.floor(Math.random() * 400));
  });

export class PeopleSearch extends defineComponent({
  props: { delay: 300, placeholder: "имя, роль или город" },
  events: { select: payload<Person>() },
  styles: [BASE_CSS, CSS],
}) {
  private query = signal("");

  render() {
    const found = resource<Person[]>(
      (abort) => {
        // Обе зависимости читаются первыми строками — до любых ранних выходов.
        const query = this.query().trim();
        const delay = this.props.delay();

        // Синхронный ответ: resource не поднимет loading, поэтому пустое поле
        // не мигает надписью «ищу…».
        if (!query) return [];

        return wait(delay, abort).then(() => fetchPeople(query));
      },
      { initialValue: [] },
    );

    const status = computed(() => {
      if (!this.query().trim()) return "idle" as const;
      if (found.loading()) return "loading" as const;
      return found.data()?.length ? ("ready" as const) : ("empty" as const);
    });

    return [
      input({
        class: "field",
        ".type": "search",
        ".value": this.query,
        ".placeholder": this.props.placeholder,
        attrs: { "aria-label": "поиск по справочнику" },
        "@input": (event) => this.query.set(event.currentTarget.value),
      }),
      // dynamic, а не цепочка when: веток четыре, и выбирает их не булево условие.
      dynamic(() => {
        switch (status()) {
          case "idle":
            return div(cls`note`, "начните вводить — запрос уйдёт после паузы");
          case "loading":
            return div(cls`note loading`, "ищу…");
          case "empty":
            return div(cls`note`, "никого не нашлось");
          case "ready":
            return ul(
              cls`results`,
              each(
                () => found.data() ?? [],
                (person) =>
                  li(
                    {
                      class: "person",
                      attrs: { role: "button", tabindex: 0 },
                      "@click": () => this.events.select(person()),
                    },
                    span(cls`name`, () => person().name),
                    span(cls`role`, () => person().role),
                    span(cls`city`, () => person().city),
                  ),
                (person) => person.id,
              ),
            );
        }
      }),
    ];
  }
}

export const peopleSearch = useCustomComponent(PeopleSearch, "x-search");

// --- демонстрация ---------------------------------------------------------------

const DEMO_CSS = css`
  .stats { margin-top: 12px; display: flex; gap: 18px; flex-wrap: wrap; color: var(--muted); }
`;

const chosen = signal("никого не выбрали");

class SearchDemo extends defineComponent({ props: {}, styles: [BASE_CSS, DEMO_CSS] }) {
  render() {
    return div(
      {},
      peopleSearch({
        ".delay": 300,
        "@select": (event) => chosen.set(`${event.detail.name} — ${event.detail.role}`),
      }),
      div(
        cls`stats`,
        span("выбран: ", span(cls`mono`, chosen)),
        span("запросов ушло: ", span(cls`mono`, requestCount)),
      ),
      div(
        cls`stats`,
        span(
          cls`muted`,
          "печатайте быстро — счётчик почти не растёт: промежуточные запросы " +
            "отменяются ещё на паузе, до похода в сеть",
        ),
      ),
    );
  }
}

const searchDemo = useCustomComponent(SearchDemo, "search-demo");

export const example: Example = {
  title: "PeopleSearch — resource, дебаунс, отмена",
  file: "examples/search.ts",
  hint:
    "resource перезапрашивает при изменении зависимостей, отменяет предыдущий запрос " +
    "через AbortSignal и игнорирует устаревший ответ. Дебаунс живёт внутри fetcher, " +
    "поэтому промежуточные запросы вообще не уходят.",
  mount: searchDemo,
};
