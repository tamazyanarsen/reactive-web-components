import { BaseElement, createEl } from "@shared/utils";

export class TablecComponent extends BaseElement {
    protected rootStyle = [
        import('@/styles/base.css?inline'),
        import('./table.scss?inline')
    ];

    render() {
        return createEl('div')(
            createEl('div flex')(),
            createEl('div flex flex-col')()
        )
    }
}