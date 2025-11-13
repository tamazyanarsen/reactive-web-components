import { BaseElement, component, div, property, signal, useCustomComponent } from "@shared/utils";

@component('dynamic-items-test')
export class DynamicItemsTestComponent extends BaseElement {
    @property()
    items = signal<{ id: number, name: string }[]>([
        { id: 1, name: 'Элемент 1' },
        { id: 2, name: 'Элемент 2' },
        { id: 3, name: 'Элемент 3' }
    ]);

    @property()
    test = signal(0);

    render() {
        const timer = setInterval(() => {
            const newItems = [
                { id: Date.now(), name: `Новый элемент ${Date.now()}` },
                { id: Date.now() + 1, name: `Тестовый элемент ${Math.floor(Math.random() * 100)}` },
                { id: Date.now() + 2, name: `Динамический элемент ${Date.now() % 1000}` },
                { id: Date.now() + 3, name: `Обновленный элемент ${Math.floor(Math.random() * 50)}` }
            ];
            this.items.set(newItems);
            // this.test.clearSubscribers();
            this.test.set(Math.random());
        }, 100);
        setTimeout(() => {
            clearInterval(timer);
        }, 7000);
        return div(
            div('Динамический список (обновляется каждые 3 сек):').addStyle({
                fontSize: '18px',
                fontWeight: 'bold',
                marginBottom: '15px',
                color: '#2563eb'
            }),
            // div(this.test),
            // div(()=>this.items().reduce((acc, item) => acc + item.id, 0).toString()),
            div(() => this.items().map(item =>
                div(
                    div(`ID: ${item.id}`),
                    div(`Название: ${item.name}`),
                    div(this.test)
                ).addStyle({
                    border: '1px solid #e5e7eb',
                    padding: '12px',
                    margin: '8px 0',
                    borderRadius: '8px',
                    backgroundColor: '#f9fafb',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                })
            ))
        ).addStyle({
            padding: '20px',
            maxWidth: '600px',
            margin: '0 auto',
            fontFamily: 'Arial, sans-serif'
        });
    }
}

// Экспорт компонента для использования
export const DynamicItemsTest = useCustomComponent(DynamicItemsTestComponent);

// Тестовый компонент для демонстрации
@component('dynamic-test-demo')
export class DynamicTestDemo extends BaseElement {
    items = signal<{ id: number, name: string }[]>([]);

    render() {
        return div(
            div('Тест динамического обновления элементов').addStyle({
                fontSize: '24px',
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: '30px',
                color: '#1f2937'
            }),
            DynamicItemsTest({
                '.items': this.items
            })
        ).addStyle({
            padding: '20px',
            backgroundColor: '#ffffff'
        });
    }
} 