/// <reference types="@rsbuild/core/types" />

interface ImportMetaEnv {
  // Добавляем вашу кастомную переменную
  readonly PACKAGE_VERSION: string;

  // Здесь же можно описать и стандартные переменные, если они нужны
  readonly NODE_ENV: "development" | "production" | "test";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
