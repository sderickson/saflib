<template>
  <article class="route-card">
    <header class="route-card__head">
      <span class="route-card__method">{{ operation.method.toUpperCase() }}</span>
      <code class="route-card__path">{{ operation.path }}</code>
      <span v-if="operation.operationId" class="route-card__op-id">
        {{ operation.operationId }}
      </span>
    </header>

    <p v-if="operation.summary" class="route-card__summary">
      {{ operation.summary }}
    </p>

    <ul v-if="operation.tags.length" class="route-card__tags">
      <li v-for="tag in operation.tags" :key="tag" class="route-card__tag">
        {{ tag }}
      </li>
    </ul>

    <dl class="route-card__bos">
      <div class="route-card__bo-row">
        <dt>in</dt>
        <dd>
          <template v-if="operation.requestSchemas.length">
            <code
              v-for="(name, i) in operation.requestSchemas"
              :key="'req-' + name"
            >
              {{ name }}<span v-if="i < operation.requestSchemas.length - 1">, </span>
            </code>
          </template>
          <span v-else class="route-card__empty">—</span>
        </dd>
      </div>
      <div class="route-card__bo-row">
        <dt>out</dt>
        <dd>
          <template v-if="operation.responseSchemas.length">
            <code
              v-for="(name, i) in operation.responseSchemas"
              :key="'res-' + name"
            >
              {{ name }}<span v-if="i < operation.responseSchemas.length - 1">, </span>
            </code>
          </template>
          <span v-else class="route-card__empty">—</span>
        </dd>
      </div>
    </dl>

    <div class="route-card__files">
      <a
        v-if="routeRepoPath"
        href="#"
        class="route-card__file"
        @click.prevent="openFile(routeRepoPath)"
      >
        route
      </a>
      <a
        v-if="operation.handler"
        href="#"
        class="route-card__file"
        @click.prevent="openFile(operation.handler.repoPath)"
      >
        handler
      </a>
      <span v-else class="route-card__missing">handler</span>
      <a
        v-if="operation.request"
        href="#"
        class="route-card__file"
        @click.prevent="openFile(operation.request.repoPath)"
      >
        request
      </a>
      <span v-else class="route-card__missing">request</span>
      <a
        v-if="operation.fake"
        href="#"
        class="route-card__file"
        @click.prevent="openFile(operation.fake.repoPath)"
      >
        fake
      </a>
      <span v-else class="route-card__missing">fake</span>
    </div>

    <section v-if="operation.handlerTests.length" class="route-card__section">
      <h4 class="route-card__section-title">Handler tests</h4>
      <ul class="route-card__specs">
        <li
          v-for="t in operation.handlerTests"
          :key="t.fullName"
          class="route-card__spec"
        >
          {{ t.fullName }}
        </li>
      </ul>
    </section>
    <p v-else class="route-card__hint">No handler test specs</p>

    <section v-if="operation.usedBy.length" class="route-card__section">
      <h4 class="route-card__section-title">SDK importers</h4>
      <ul class="route-card__list">
        <li
          v-for="u in operation.usedBy"
          :key="u.packageName + ':' + u.repoPath"
        >
          <a
            href="#"
            class="route-card__file"
            @click.prevent="openFile(u.repoPath)"
          >
            {{ u.packageName }}/{{ u.filePath }}
          </a>
        </li>
      </ul>
    </section>
    <p v-else class="route-card__hint">No non-test SDK importers</p>

    <section
      v-if="operation.enqueues?.length || operation.enqueuedBy?.length"
      class="route-card__section"
    >
      <h4 class="route-card__section-title">Jobs</h4>
      <dl class="route-card__jobs">
        <div v-if="operation.enqueues?.length" class="route-card__job-row">
          <dt>enqueues</dt>
          <dd>
            <code class="route-card__job-id">{{
              operation.enqueues.join(", ")
            }}</code>
          </dd>
        </div>
        <div v-if="operation.enqueuedBy?.length" class="route-card__job-row">
          <dt>enqueued by</dt>
          <dd>
            <code class="route-card__job-id">{{
              operation.enqueuedBy.join(", ")
            }}</code>
          </dd>
        </div>
      </dl>
    </section>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";

export interface RouteCardFileRef {
  filePath: string;
  repoPath: string;
}

export interface RouteCardUsedBy {
  packageName: string;
  filePath: string;
  repoPath: string;
}

export interface RouteCardTestSpec {
  fullName: string;
}

/** Shared route triangle card — used by spec (and later http/sdk) panes. */
export interface RouteCardOperation {
  operationId: string;
  method: string;
  path: string;
  summary?: string | null;
  tags: string[];
  yamlPath: string;
  routeStem?: string | null;
  handler: RouteCardFileRef | null;
  request: RouteCardFileRef | null;
  /** SDK `*.fake.ts` beside the request, when present. */
  fake: RouteCardFileRef | null;
  handlerTests: RouteCardTestSpec[];
  requestSchemas: string[];
  responseSchemas: string[];
  usedBy: RouteCardUsedBy[];
  /** Job targets this op may enqueue (from product trigger map). */
  enqueues?: string[];
  /** Callers (ops or `cron:…`) that may enqueue this op. */
  enqueuedBy?: string[];
}

const props = defineProps<{
  operation: RouteCardOperation;
  /** Repo-relative path for the route YAML (spec package–prefixed). */
  routeRepoPath: string;
  openFile: (repoPath: string) => void;
}>();

const operation = computed(() => props.operation);
</script>

<style scoped>
.route-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  padding: 0.65rem 0.85rem;
}
.route-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 0.75rem;
}
.route-card__method {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.route-card__path {
  font-size: 0.875rem;
}
.route-card__op-id {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.45);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.route-card__summary {
  margin: 0.35rem 0 0;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.route-card__tags {
  list-style: none;
  margin: 0.4rem 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}
.route-card__tag {
  font-size: 0.65rem;
  letter-spacing: 0.02em;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.18);
  color: rgba(var(--v-theme-on-surface), 0.65);
}
.route-card__bos {
  margin: 0.45rem 0 0;
  display: grid;
  gap: 0.2rem;
  font-size: 0.75rem;
}
.route-card__bo-row {
  display: grid;
  grid-template-columns: 1.5rem minmax(0, 1fr);
  gap: 0.5rem;
  align-items: baseline;
}
.route-card__bo-row dt {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.45);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.65rem;
  letter-spacing: 0.04em;
}
.route-card__bo-row dd {
  margin: 0;
}
.route-card__empty {
  color: rgba(var(--v-theme-on-surface), 0.35);
}
.route-card__files {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 0.5rem;
  font-size: 0.8125rem;
}
.route-card__file {
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  font: inherit;
  text-decoration: underline;
  user-select: text;
}
.route-card__missing {
  color: rgba(var(--v-theme-on-surface), 0.35);
  text-decoration: line-through;
}
.route-card__section {
  margin-top: 0.55rem;
}
.route-card__section-title {
  margin: 0 0 0.25rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.route-card__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.2rem;
  font-size: 0.8125rem;
}
.route-card__specs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.25rem;
}
.route-card__spec {
  font-size: 0.75rem;
  line-height: 1.35;
  color: rgba(var(--v-theme-on-surface), 0.78);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.route-card__hint {
  margin: 0.4rem 0 0;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.45);
}
.route-card__jobs {
  margin: 0;
  display: grid;
  gap: 0.25rem;
  font-size: 0.75rem;
}
.route-card__job-row {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr);
  gap: 0.5rem;
  align-items: baseline;
}
.route-card__job-row dt {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.45);
  font-weight: 600;
  font-size: 0.65rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.route-card__job-row dd {
  margin: 0;
}
.route-card__job-id {
  font-size: 0.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
</style>
