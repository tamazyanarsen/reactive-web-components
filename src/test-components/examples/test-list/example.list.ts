import { ComponentConfig } from "@shared/types";
import { BaseElement, component, defineSlotTemplate, div, event, getList, newEventEmitter, oldGetList, property, show, signal, useCustomComponent } from "@shared/utils";

@component('example-list')
export class ExampleListComponent extends BaseElement {
  public slotContext = {
    'item': signal<{ id: number, name: string } | null>({ id: 1, name: 'Item 1' })
  };

  public slotTemplate = defineSlotTemplate<
    {
      item: (slotCtx: { id: number, name: string }) => ComponentConfig<any> | null,
      indexTemplate: (slotCtx: number) => ComponentConfig<any>
    }
  >()

  @property()
  items = signal<{ id: number, name: string }[]>([
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' },
  ])

  @event()
  testEvent = newEventEmitter<void>();

  render() {
    let index = 0;
    const testSignalShow = signal(true);

    const timer = setInterval(() => {
      testSignalShow.set(!testSignalShow());
      this.items.set([
        { id: 1, name: `Item 1` },
        { id: index % 4 + 5, name: `Item ${Math.ceil(Math.random() * 100)}` },
        { id: 3, name: `Item 3` },
        { id: index % 4 + 4, name: `Item ${Math.ceil(Math.random() * 100)}` },
      ]);
      index++;
    }, 1500);
    setTimeout(() => {
      clearInterval(timer)
    }, 45000);
    return div(
      {
        style: {
          '--bg-test': 'red',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        },
      },
      div(
        {
          style: {
            // backgroundColor: 'var(--bg-test)',
            display: 'flex',
            gap: '2rem',
          },
          '@click': () => this.testEvent(),
        },
        div(() => this.items().map((item) => div(item.name))),
        div(
          oldGetList(
            this.items,
            (item) => item.id,
            (item) => div(item.name)
          )
        ),
        div(
          getList(
            this.items,
            (item) => item.id,
            (item) => div(item.name)
          )
        ),
        // slot({ '.name': 'item' }),
        ...new Array(10).fill(1).map((_, index) =>
          div(
            // slot({ '.name': 'item' }, (index + 1).toString()),
            this.slotTemplate.indexTemplate?.(index) ||
            div((index + 1).toString())
          )
        ),
        this.slotTemplate.item?.({
          id: 1111111111111111,
          name: 'test item!!!!!!',
        }) || div()
      ),
      show(
        testSignalShow,
        () => div('test signal show'),
        () => div('test signal show else')
      )
    );
  }
}

const allItems = [
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' },
  { id: 3, name: 'Item 3' },
]

const ExampleList = useCustomComponent(ExampleListComponent)

@component('example-list-test')
export class ExampleListTest extends BaseElement {
  render() {
    return div(
      ExampleList({
        '.items': allItems
      }).setSlotTemplate(
        {
          item: () => null,
          indexTemplate: indexCtx => indexCtx % 2 === 0 ? div('get index context in template', indexCtx.toString()) : div(),
        }
      ),
      // ExampleList(
      //     div({
      //         '.slot': 'item',
      //         customListeners: {
      //             handleSlotContext: (e) => {
      //                 colorLog('handleSlotContext value', e.detail as { id: number, name: string })
      //             }
      //         }
      //     }),
      //     div({
      //         '.slot': 'item',
      //         customListeners: {
      //             handleSlotContext: (e) => {
      //                 colorLog('handleSlotContext value', e.detail as { id: number, name: string })
      //             }
      //         }
      //     })
      // )
    )
  }
}
