// rwc-ui-0-1 — опубликованный @rwcjs/ui 0.1.0, он стоит только в site/node_modules.
// Корневой typecheck в CI ставит зависимости одного корня, поэтому тип старого кита
// описываем через текущий: публичный API у версий одинаковый.
declare module "rwc-ui-0-1" {
  export * from "@rwcjs/ui";
}
