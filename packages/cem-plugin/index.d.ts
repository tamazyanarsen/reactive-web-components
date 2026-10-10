export type RwcPluginOptions = {
  /** Имена defineComponent, если его переименовали при импорте. */
  defineComponent?: string[];
  /** Имена функций регистрации. По умолчанию useCustomComponent и configCustomComponent. */
  register?: string[];
};

/** Плагин @custom-elements-manifest/analyzer для компонентов rwc. */
export declare function rwcPlugin(options?: RwcPluginOptions): {
  name: string;
  analyzePhase(context: { ts: unknown; node: unknown; moduleDoc: unknown }): void;
  moduleLinkPhase(context: { moduleDoc: unknown }): void;
};
