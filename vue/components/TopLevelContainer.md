# TopLevelContainer (removed)

`TopLevelContainer` was removed. Use **`ContentWidth`** instead.

```vue
<script setup lang="ts">
import { ContentWidth } from "@saflib/vue/components";
</script>

<template>
  <ContentWidth variant="wide">
    <!-- page content -->
  </ContentWidth>
</template>
```

**Variants:** `narrow` · `medium` · `wide` (default) · `full`

- Layout shells (`BaseLayout`, `ProductLayout`) should **not** wrap routes in a width container — only `px-4` padding on `v-main`.
- Each page owns one `ContentWidth`; do not nest another outer `v-container` / row / col shell.

See `ContentWidth.vue` for breakpoint recipes.
