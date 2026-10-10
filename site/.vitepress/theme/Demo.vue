<script setup lang="ts">
// Живой пример на rwc внутри страницы VitePress. Модуль из site/demos/<name>.ts
// экспортирует по умолчанию функцию, которая строит разметку; она выполняется в
// createRoot, а при уходе со страницы корень уничтожается вместе с эффектами.
import { onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps<{ name: string }>();
const host = ref<HTMLElement | null>(null);
let dispose: (() => void) | null = null;

const demos = import.meta.glob<{ default: () => Node }>("../../demos/*.ts");

onMounted(async () => {
  const load = demos[`../../demos/${props.name}.ts`];
  if (!load || !host.value) return;
  const [{ default: build }, { createRoot }] = await Promise.all([load(), import("@rwcjs/core")]);
  if (!host.value) return;
  const node = createRoot((destroy) => {
    dispose = destroy;
    return build();
  });
  host.value.append(node);
});

onBeforeUnmount(() => {
  dispose?.();
  host.value?.replaceChildren();
});
</script>

<template>
  <div ref="host" class="rwc-demo" />
</template>

<style scoped>
.rwc-demo {
  margin: 16px 0;
  padding: 24px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
}
</style>
