<template>
  <v-dialog
    :model-value="modelValue"
    fullscreen
    persistent
    no-click-animation
    transition="dialog-bottom-transition"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="pkg-map">
      <div class="pkg-map__bar">
        <v-icon icon="mdi-graph-outline" class="mr-2" />
        <span class="text-subtitle-1 font-weight-medium mr-3">Package map</span>
        <span v-if="base" class="text-caption text-medium-emphasis mr-4">
          changes since the fork point
        </span>
        <v-text-field
          v-model="search"
          class="pkg-map__search"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          placeholder="Find a package"
          prepend-inner-icon="mdi-magnify"
          @keydown.enter="selectFirstMatch"
        />
        <v-switch
          v-model="transitive"
          class="ml-4"
          density="compact"
          hide-details
          color="primary"
          label="Transitive"
        />
        <div class="pkg-map__legend ml-4">
          <span><i class="sw sw--dep" />depends on</span>
          <span><i class="sw sw--user" />used by</span>
          <span><i class="sw sw--violation" />layer violation</span>
          <template v-if="base">
            <span><i class="sw sw--added" />added</span>
            <span><i class="sw sw--removed" />removed</span>
          </template>
        </div>
        <v-spacer />
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="emit('update:modelValue', false)"
        />
      </div>

      <div class="pkg-map__body">
        <div ref="scroller" class="pkg-map__canvas" @click.self="selected = ''">
          <v-progress-linear v-if="loading" indeterminate />
          <p v-else-if="!layout.nodes.length" class="pa-6 text-medium-emphasis">
            No product packages found.
          </p>
          <div
            v-else
            class="pkg-map__grid"
            :style="{
              width: `${layout.width}px`,
              height: `${layout.height}px`,
            }"
          >
            <!-- Feature names, pinned to the top while scrolling -->
            <div
              class="pkg-map__top"
              :style="{ width: `${layout.width}px`, height: `${HEADER}px` }"
            >
              <div class="pkg-map__corner" :style="{ width: `${L.labelW}px` }">
                layer ╲ feature
              </div>
              <div
                v-for="lane in layout.lanes"
                :key="lane.feature"
                class="pkg-map__lane-label"
                :class="{ 'pkg-map__lane-label--collapsed': lane.collapsed }"
                :style="{ left: `${lane.x}px`, width: `${lane.width}px` }"
                :title="laneLabel(lane.feature)"
              >
                {{ laneLabel(lane.feature) }}
                <span
                  v-if="lane.core && !lane.collapsed"
                  class="pkg-map__core-tag"
                  >core</span
                >
              </div>
            </div>
            <!-- Layer names, pinned to the left while scrolling -->
            <div
              class="pkg-map__side"
              :style="{
                width: `${L.labelW - 10}px`,
                height: `${layout.height}px`,
                marginTop: `-${HEADER}px`,
              }"
            >
              <div
                v-for="row in layout.rows"
                :key="row.label"
                class="pkg-map__row-label"
                :style="{
                  top: `${row.y}px`,
                  height: `${row.height}px`,
                  opacity: row.height > 0 ? 1 : 0,
                }"
              >
                <v-tooltip location="end" max-width="340" open-delay="150">
                  <template #activator="{ props: tip }">
                    <span v-bind="tip" class="pkg-map__row-name">{{
                      row.label
                    }}</span>
                  </template>
                  {{ row.description }}
                </v-tooltip>
              </div>
            </div>
            <svg
              :width="layout.width"
              :height="layout.height"
              class="pkg-map__svg"
              @click="onSvgClick"
            >
              <defs>
                <marker
                  v-for="m in markers"
                  :id="`pkg-map-arrow-${m}`"
                  :key="m"
                  viewBox="0 0 8 8"
                  refX="7"
                  refY="4"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M0,0 L8,4 L0,8 z" :class="`arrow arrow--${m}`" />
                </marker>
              </defs>

              <!-- Feature lanes -->
              <g v-for="lane in layout.lanes" :key="lane.feature">
                <rect
                  :x="lane.x"
                  :y="L.headerH - 8"
                  :width="lane.width"
                  :height="layout.height - L.headerH"
                  :style="{
                    x: `${lane.x}px`,
                    width: `${lane.width}px`,
                    height: `${layout.height - L.headerH}px`,
                  }"
                  rx="10"
                  :class="['lane', lane.core ? 'lane--core' : 'lane--offshoot']"
                />
              </g>

              <!-- Layer rows -->
              <line
                v-for="row in layout.rows"
                :key="row.label"
                :x1="L.labelW"
                :x2="layout.width"
                y1="0"
                y2="0"
                :style="{
                  transform: `translateY(${row.y + row.height + L.rowGap / 2}px)`,
                  opacity: row.height > 0 ? 1 : 0,
                }"
                class="row__rule"
              />

              <!-- Edges -->
              <path
                v-for="e in drawnEdges"
                :key="e.id"
                :d="e.d"
                :style="{ d: `path('${e.d}')` }"
                :class="e.classes"
                :marker-end="`url(#pkg-map-arrow-${e.marker})`"
              >
                <title>{{ e.title }}</title>
              </path>

              <!-- Packages -->
              <g
                v-for="n in layout.nodes"
                :key="n.package_name"
                :style="{ transform: `translate(${n.x}px, ${n.y}px)` }"
                :class="nodeClasses(n)"
                class="node"
                @click.stop="select(n.package_name)"
                @dblclick.stop="openPackage(n)"
              >
                <title>
                  {{ n.package_name }} ({{ n.kind }}){{
                    n.change ? ` · ${n.change}` : ""
                  }}
                </title>
                <rect
                  :width="L.nodeW"
                  :height="L.nodeH"
                  rx="6"
                  class="node__box"
                />
                <rect
                  width="5"
                  :height="L.nodeH"
                  rx="2"
                  :fill="kindColor(n.kind)"
                />
                <text x="12" :y="L.nodeH / 2 + 4" class="node__label">
                  {{ truncate(shortName(n.package_name), 22) }}
                </text>
                <text
                  :x="L.nodeW - 8"
                  :y="L.nodeH / 2 + 4"
                  text-anchor="end"
                  class="node__kind"
                >
                  {{ n.kind }}
                </text>
              </g>
            </svg>
          </div>
        </div>

        <aside v-if="selectedNode" class="pkg-map__panel">
          <div class="d-flex align-start">
            <div class="flex-grow-1">
              <div class="text-subtitle-1 font-weight-medium pkg-map__name">
                {{ selectedNode.package_name }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ selectedNode.directory }}
              </div>
            </div>
            <v-btn
              icon="mdi-close"
              size="small"
              variant="text"
              @click="selected = ''"
            />
          </div>
          <p v-if="selectedNode.description" class="pkg-map__description">
            {{ selectedNode.description }}
          </p>
          <div class="d-flex flex-wrap ga-1 my-2">
            <v-chip
              size="x-small"
              variant="tonal"
              :color="kindColor(selectedNode.kind)"
            >
              {{ selectedNode.kind }}
            </v-chip>
            <v-chip size="x-small" variant="tonal">
              {{ laneLabel(selectedNode.feature)
              }}{{ selectedNode.core ? " · core" : "" }}
            </v-chip>
            <v-chip
              v-if="selectedNode.change"
              size="x-small"
              variant="tonal"
              :color="changeChipColor(selectedNode.change)"
            >
              {{ selectedNode.change }}
            </v-chip>
          </div>
          <v-btn
            size="small"
            variant="tonal"
            prepend-icon="mdi-open-in-app"
            :disabled="selectedNode.change === 'removed'"
            class="mb-3"
            @click="openPackage(selectedNode)"
          >
            Open in checkout
          </v-btn>

          <div class="pkg-map__section">
            Depends on ({{ dependencyEdges.length }})
            <span v-if="transitive" class="text-medium-emphasis">
              · {{ transitiveSet.size }} transitively
            </span>
          </div>
          <EdgeList :edges="dependencyEdges" side="to" @pick="select" />

          <div class="pkg-map__section mt-3">
            Used by ({{ dependentEdges.length }})
          </div>
          <EdgeList :edges="dependentEdges" side="from" @pick="select" />
        </aside>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  defineComponent,
  h,
  nextTick,
  ref,
  watch,
  type PropType,
} from "vue";
import { VChip } from "vuetify/components";
import {
  LAYOUT as L,
  laneLabel,
  layoutPackageGraph,
  mergePackageGraphs,
  shortPackageName,
  transitiveDependencies,
  type MapEdge,
  type PackageGraphData,
  type PlacedNode,
} from "../package-graph-layout.ts";

/** Height of the pinned feature header (the lanes start just below it). */
const HEADER = L.headerH - 12;

const props = defineProps<{
  modelValue: boolean;
  head?: PackageGraphData;
  /** Fork-point graph in compare mode. */
  base?: PackageGraphData;
  loading?: boolean;
  /** Package selected in the checkout page, pre-selected on open. */
  initialPackage?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [open: boolean];
  "open-package": [packageName: string];
}>();

const search = ref("");
const transitive = ref(false);
const selected = ref("");
const scroller = ref<HTMLElement | null>(null);

const merged = computed(() =>
  props.head
    ? mergePackageGraphs(props.head, props.base)
    : { nodes: [], edges: [], hasChanges: false },
);
/**
 * While a package is selected, only it and its related packages take up
 * space; the rest fade out and empty lanes and rows collapse. Box order never
 * changes, so nothing reshuffles.
 */
const layout = computed(() =>
  layoutPackageGraph(merged.value, {
    visible: selected.value ? related.value : undefined,
  }),
);
const byName = computed(
  () => new Map(layout.value.nodes.map((n) => [n.package_name, n])),
);
const allNames = computed(() => layout.value.nodes.map((n) => n.package_name));
const shortName = (name: string) => shortPackageName(name, allNames.value);
const truncate = (s: string, max: number) =>
  s.length > max ? `${s.slice(0, max - 1)}…` : s;

const selectedNode = computed(() => byName.value.get(selected.value));
const transitiveSet = computed(() =>
  selected.value && transitive.value
    ? transitiveDependencies(
        selected.value,
        merged.value.edges.filter((e) => e.change !== "removed"),
      )
    : new Set<string>(),
);
const dependencyEdges = computed(() =>
  merged.value.edges.filter((e) => e.from === selected.value),
);
const dependentEdges = computed(() =>
  merged.value.edges.filter((e) => e.to === selected.value),
);
const related = computed(() => {
  const set = new Set<string>();
  if (!selected.value) return set;
  set.add(selected.value);
  for (const e of dependencyEdges.value) set.add(e.to);
  for (const e of dependentEdges.value) set.add(e.from);
  for (const n of transitiveSet.value) set.add(n);
  return set;
});

const searchMatches = computed(() => {
  const q = search.value?.trim().toLowerCase();
  if (!q) return null;
  return new Set(
    layout.value.nodes
      .filter((n) => n.package_name.toLowerCase().includes(q))
      .map((n) => n.package_name),
  );
});

function nodeClasses(n: PlacedNode) {
  const dimmed =
    (selected.value && !related.value.has(n.package_name)) ||
    (searchMatches.value && !searchMatches.value.has(n.package_name));
  return {
    "node--hidden": n.hidden,
    "node--selected": n.package_name === selected.value,
    "node--dimmed": dimmed,
    "node--dep":
      !!selected.value &&
      n.package_name !== selected.value &&
      (dependencyEdges.value.some((e) => e.to === n.package_name) ||
        transitiveSet.value.has(n.package_name)),
    [`node--${n.change}`]: !!n.change,
  };
}

const markers = ["plain", "dep", "user", "violation", "added", "removed"];

function edgePath(from: PlacedNode, to: PlacedNode): string {
  const fx = from.x + L.nodeW / 2;
  const tx = to.x + L.nodeW / 2;
  if (to.y > from.y + 1) {
    const y1 = from.y + L.nodeH;
    const y2 = to.y;
    const dy = (y2 - y1) / 2;
    return `M${fx},${y1} C${fx},${y1 + dy} ${tx},${y2 - dy} ${tx},${y2}`;
  }
  if (to.y < from.y - 1) {
    const y1 = from.y;
    const y2 = to.y + L.nodeH;
    const dy = (y1 - y2) / 2;
    return `M${fx},${y1} C${fx},${y1 - dy} ${tx},${y2 + dy} ${tx},${y2}`;
  }
  const y = from.y + L.nodeH;
  return `M${fx},${y} C${fx},${y + 36} ${tx},${y + 36} ${tx},${y}`;
}

const drawnEdges = computed(() => {
  const sel = selected.value;
  return merged.value.edges
    .map((e: MapEdge) => {
      const from = byName.value.get(e.from);
      const to = byName.value.get(e.to);
      if (!from || !to) return null;
      const isDep =
        !!sel &&
        (e.from === sel ||
          (transitiveSet.value.has(e.from) && transitiveSet.value.has(e.to)));
      const isUser = !!sel && e.to === sel;
      const dimmed =
        (!!sel && !isDep && !isUser) ||
        (!!searchMatches.value &&
          !(searchMatches.value.has(e.from) || searchMatches.value.has(e.to)));
      const marker = isDep
        ? "dep"
        : isUser
          ? "user"
          : (e.change ?? (e.violation ? "violation" : "plain"));
      return {
        id: e.id,
        d: edgePath(from, to),
        marker,
        classes: {
          edge: true,
          "edge--dep": isDep,
          "edge--user": isUser,
          "edge--violation": !!e.violation,
          [`edge--${e.change}`]: !!e.change,
          "edge--dimmed": dimmed,
          "edge--hidden": from.hidden || to.hidden,
        },
        title: `${e.from} → ${e.to}${e.change ? ` (${e.change})` : ""}${
          e.violation ? `\n${e.violation.message}` : ""
        }`,
        // Highlighted edges draw last so they sit on top.
        order: isDep || isUser ? 2 : e.violation || e.change ? 1 : 0,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => a.order - b.order);
});

async function select(name: string) {
  selected.value = name;
  // Lanes collapse/expand with the selection; scroll once laid out.
  await nextTick();
  scrollToNode(name);
}

function onSvgClick(event: MouseEvent) {
  if (event.target === event.currentTarget) selected.value = "";
}

function scrollToNode(name: string) {
  const n = byName.value.get(name);
  const el = scroller.value;
  if (!n || !el) return;
  const left = n.x + L.nodeW / 2 - el.clientWidth / 2;
  const top = n.y + L.nodeH / 2 - el.clientHeight / 2;
  const visible =
    n.x >= el.scrollLeft &&
    n.x + L.nodeW <= el.scrollLeft + el.clientWidth &&
    n.y >= el.scrollTop &&
    n.y + L.nodeH <= el.scrollTop + el.clientHeight;
  if (!visible) el.scrollTo({ left, top, behavior: "smooth" });
}

function selectFirstMatch() {
  const first = searchMatches.value?.values().next().value;
  if (first) select(first);
}

function openPackage(n: PlacedNode) {
  if (n.change === "removed") return;
  emit("open-package", n.package_name);
  emit("update:modelValue", false);
}

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return;
    if (props.initialPackage && byName.value.has(props.initialPackage)) {
      selected.value = props.initialPackage;
      await nextTick();
      scrollToNode(props.initialPackage);
    }
  },
);

/**
 * Escape never closes the map (the dialog is persistent); it clears the
 * selection, or the search when nothing is selected.
 */
function onKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape" || !props.modelValue) return;
  event.preventDefault();
  if (selected.value) selected.value = "";
  else if (search.value) search.value = "";
}
window.addEventListener("keydown", onKeydown);
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));

const KIND_COLORS: Record<string, string> = {
  app: "#6a1b9a",
  spa: "#8e24aa",
  "http-app": "#283593",
  vue: "#00838f",
  http: "#1565c0",
  sdk: "#0097a7",
  "http-common": "#1e88e5",
  "sdk-common": "#26a69a",
  domain: "#2e7d32",
  integration: "#ef6c00",
  db: "#6d4c41",
  spec: "#5c6bc0",
  objects: "#c0ca33",
  lib: "#757575",
  other: "#9e9e9e",
  test: "#bdbdbd",
};
const kindColor = (kind: string) => KIND_COLORS[kind] ?? "#9e9e9e";
const changeChipColor = (change: string) =>
  change === "added" ? "success" : change === "removed" ? "error" : "warning";

/** Clickable list of dependency edges for the side panel. */
const EdgeList = defineComponent({
  props: {
    edges: { type: Array as PropType<MapEdge[]>, required: true },
    side: { type: String as PropType<"from" | "to">, required: true },
  },
  emits: ["pick"],
  setup(p, { emit: emitPick }) {
    return () =>
      p.edges.length === 0
        ? h("div", { class: "text-caption text-medium-emphasis" }, "None")
        : h(
            "ul",
            { class: "pkg-map__list" },
            [...p.edges]
              .sort((a, b) => a[p.side].localeCompare(b[p.side]))
              .map((e) =>
                h("li", { key: e.id }, [
                  h(
                    "a",
                    {
                      href: "#",
                      class: e.change === "removed" ? "is-removed" : "",
                      onClick: (ev: Event) => {
                        ev.preventDefault();
                        emitPick("pick", e[p.side]);
                      },
                    },
                    e[p.side],
                  ),
                  e.change
                    ? h(
                        VChip,
                        {
                          size: "x-small",
                          variant: "tonal",
                          class: "ml-1",
                          color: changeChipColor(e.change),
                        },
                        () => e.change,
                      )
                    : null,
                  e.violation
                    ? h(
                        "div",
                        { class: "pkg-map__violation" },
                        e.violation.message,
                      )
                    : null,
                ]),
              ),
          );
  },
});
</script>

<style scoped>
.pkg-map {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.pkg-map__bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 0;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.pkg-map__search {
  max-width: 260px;
}
.pkg-map__legend {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.pkg-map__legend .sw {
  display: inline-block;
  width: 18px;
  height: 3px;
  margin-right: 4px;
  vertical-align: middle;
  border-radius: 2px;
}
.sw--dep {
  background: #1976d2;
}
.sw--user {
  background: #8e24aa;
}
.sw--violation {
  background: #e53935;
}
.sw--added {
  background: #2e7d32;
}
.sw--removed {
  background: repeating-linear-gradient(
    90deg,
    #c62828 0 4px,
    transparent 4px 7px
  );
}
.pkg-map__body {
  display: flex;
  flex: 1;
  min-height: 0;
}
.pkg-map__canvas {
  flex: 1;
  overflow: auto;
  background: rgb(var(--v-theme-background));
}
.pkg-map__grid {
  position: relative;
}
.pkg-map__svg {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  display: block;
  font-family: inherit;
}
.pkg-map__top {
  position: sticky;
  top: 0;
  z-index: 3;
  background: rgb(var(--v-theme-background));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.pkg-map__corner {
  position: sticky;
  left: 0;
  z-index: 4;
  height: 100%;
  display: flex;
  align-items: flex-end;
  padding: 0 12px 8px;
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.45);
  background: rgb(var(--v-theme-background));
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.pkg-map__lane-label {
  position: absolute;
  bottom: 8px;
  padding-left: 12px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: rgba(var(--v-theme-on-surface), 0.85);
}
.pkg-map__lane-label--collapsed {
  padding-left: 0;
  text-align: center;
  font-size: 11px;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.pkg-map__row-name {
  cursor: help;
  text-decoration: underline;
  text-decoration-color: rgba(var(--v-theme-on-surface), 0.25);
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}
.pkg-map__row-name:hover {
  text-decoration-color: rgba(var(--v-theme-on-surface), 0.6);
}
.pkg-map__description {
  font-size: 13px;
  line-height: 1.45;
  margin: 6px 0 2px;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
.pkg-map__core-tag {
  margin-left: 4px;
  font-size: 10px;
  font-weight: 500;
  color: rgb(var(--v-theme-primary));
}
.pkg-map__side {
  position: sticky;
  left: 0;
  z-index: 2;
  background: rgb(var(--v-theme-background));
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.pkg-map__row-label {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 11px;
  line-height: 1.3;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(var(--v-theme-on-surface), 0.55);
}
.pkg-map__panel {
  width: 340px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 12px 14px;
  border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.pkg-map__name {
  word-break: break-all;
}
.pkg-map__section {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}
.pkg-map :deep(.pkg-map__list) {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 13px;
}
.pkg-map :deep(.pkg-map__list li) {
  padding: 2px 0;
}
.pkg-map :deep(.pkg-map__list a) {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
  word-break: break-all;
}
.pkg-map :deep(.pkg-map__list a.is-removed) {
  text-decoration: line-through;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.pkg-map :deep(.pkg-map__violation) {
  color: #e53935;
  font-size: 12px;
  margin: 2px 0 4px;
}

.lane {
  stroke: rgba(var(--v-border-color), 0.25);
}
.lane--core {
  fill: rgba(var(--v-theme-primary), 0.05);
}
.lane--offshoot {
  fill: rgba(var(--v-theme-on-surface), 0.03);
}
.row__rule {
  stroke: rgba(var(--v-border-color), 0.2);
  stroke-dasharray: 3 4;
}
.edge {
  fill: none;
  stroke: rgba(var(--v-theme-on-surface), 0.22);
  stroke-width: 1.2;
}
.edge--violation {
  stroke: #e53935;
  stroke-width: 1.8;
}
.edge--added {
  stroke: #2e7d32;
  stroke-width: 1.8;
}
.edge--removed {
  stroke: #c62828;
  stroke-dasharray: 5 4;
}
.edge--dep {
  stroke: #1976d2;
  stroke-width: 2.2;
}
.edge--user {
  stroke: #8e24aa;
  stroke-width: 2.2;
}
.edge--dimmed {
  opacity: 0.12;
}
.arrow--plain {
  fill: rgba(var(--v-theme-on-surface), 0.35);
}
.arrow--dep {
  fill: #1976d2;
}
.arrow--user {
  fill: #8e24aa;
}
.arrow--violation,
.arrow--removed {
  fill: #e53935;
}
.arrow--added {
  fill: #2e7d32;
}

.node {
  cursor: pointer;
}
.node__box {
  fill: rgb(var(--v-theme-surface));
  stroke: rgba(var(--v-border-color), 0.45);
}
.node:hover .node__box {
  stroke: rgb(var(--v-theme-primary));
}
.node__label {
  font-size: 12px;
  fill: rgb(var(--v-theme-on-surface));
}
.node__kind {
  font-size: 9px;
  fill: rgba(var(--v-theme-on-surface), 0.5);
}
.node--selected .node__box {
  stroke: rgb(var(--v-theme-primary));
  stroke-width: 2.5;
}
.node--dep .node__box {
  stroke: #1976d2;
  stroke-width: 1.5;
}
.node--added .node__box {
  stroke: #2e7d32;
  stroke-width: 2;
  fill: rgba(46, 125, 50, 0.08);
}
.node--changed .node__box {
  stroke: #f9a825;
  stroke-width: 2;
}
.node--removed {
  opacity: 0.55;
}
.node--removed .node__box {
  stroke: #c62828;
  stroke-dasharray: 4 3;
}
.node--dimmed {
  opacity: 0.25;
}

/* Focus changes animate: nodes slide, lanes and rows resize, edges morph. */
.pkg-map__grid,
.pkg-map__lane-label,
.pkg-map__row-label {
  transition:
    width 0.35s ease,
    height 0.35s ease,
    left 0.35s ease,
    top 0.35s ease,
    opacity 0.25s ease;
}
.lane {
  transition:
    x 0.35s ease,
    width 0.35s ease,
    height 0.35s ease;
}
.row__rule {
  transition:
    transform 0.35s ease,
    opacity 0.25s ease;
}
.node {
  transition:
    transform 0.35s ease,
    opacity 0.25s ease;
}
.node--hidden {
  opacity: 0 !important;
  pointer-events: none;
}
.edge {
  transition:
    d 0.35s ease,
    opacity 0.25s ease;
}
.edge--hidden {
  opacity: 0 !important;
}
</style>
