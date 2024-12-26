import { ComponentConfig } from "@shared/types";
import { BaseElement, component, createCustomElement, createElement, property, signal } from "@shared/utils";

import { FluentDesignSystem, MenuItem, MenuItemDefinition, MenuList, MenuListDefinition } from "@fluentui/web-components";
MenuItemDefinition.define(FluentDesignSystem.registry)
MenuListDefinition.define(FluentDesignSystem.registry)

interface MenuItemValue { label: string; value: string }

@component('fluent-select')
export class SelectFluentComponent extends BaseElement {
  @property()
  items = signal<MenuItemValue[]>([])

  render(): ComponentConfig {
    return createElement('div')
      .append(
        createCustomElement<MenuList>('fluent-menu-list')
          .addEffect(self =>
            self.append(
              ...this.items()
                .map(e =>
                  createCustomElement<MenuItem>('fluent-menu-item')
                    .setHtmlContent(e.label))
            )
          )
      )
  }
}
