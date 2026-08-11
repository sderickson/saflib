import { addCustomTab } from "@vue/devtools-kit";
import { getBaseUrl } from "@saflib/sdk";

let registered = false;

/**
 * Registers a Vue DevTools tab that tails the monolith's development
 * Winston ring buffer (`GET /dev/logs` + SSE `/dev/logs/stream`).
 *
 * Only runs in Vite DEV. Safe no-op if `setClientName` has not run yet
 * (API base URL cannot be resolved).
 */
export function registerDevLogsDevtoolsTab(): void {
  if (registered) return;
  if (!import.meta.env.DEV) return;

  let apiBase: string;
  try {
    apiBase = getBaseUrl("api");
  } catch {
    return;
  }

  registered = true;

  const sfc = /* vue */ `
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const API_BASE = ${JSON.stringify(apiBase)}

type DevLogEntry = {
  id: number
  timestamp?: string
  level: string
  message: string
  reqId?: string
  service_name?: string
  subsystem_name?: string
  operation_name?: string
  meta?: unknown
}

const logs = ref<DevLogEntry[]>([])
const status = ref<'connecting' | 'live' | 'error' | 'paused'>('connecting')
const errorMessage = ref('')
const filter = ref('')
const levelFilter = ref('all')
const paused = ref(false)
const stickToBottom = ref(true)
const listEl = ref<HTMLElement | null>(null)
const expandedId = ref<number | null>(null)

let abort: AbortController | null = null
let pending: DevLogEntry[] = []
let lastEventId: number | undefined
let reconnectTimer: ReturnType<typeof setTimeout> | undefined

const levelOptions = ['all', 'error', 'warn', 'info', 'verbose', 'debug', 'silly']
const META_PREVIEW_MAX = 120

function metaText(meta: unknown): string {
  try {
    return JSON.stringify(meta)
  } catch {
    return String(meta)
  }
}

function metaPreview(meta: unknown): string {
  const text = metaText(meta)
  if (text.length <= META_PREVIEW_MAX) return text
  return text.slice(0, META_PREVIEW_MAX - 1) + '…'
}

function metaPretty(meta: unknown): string {
  try {
    return JSON.stringify(meta, null, 2)
  } catch {
    return String(meta)
  }
}

function toggleExpand(entry: DevLogEntry) {
  if (entry.meta === undefined) return
  expandedId.value = expandedId.value === entry.id ? null : entry.id
}

const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase()
  return logs.value.filter((entry) => {
    if (levelFilter.value !== 'all' && entry.level !== levelFilter.value) {
      return false
    }
    if (!q) return true
    const metaStr =
      entry.meta === undefined ? '' : metaText(entry.meta).toLowerCase()
    return (
      entry.message.toLowerCase().includes(q) ||
      metaStr.includes(q) ||
      (entry.subsystem_name?.toLowerCase().includes(q) ?? false) ||
      (entry.operation_name?.toLowerCase().includes(q) ?? false) ||
      (entry.reqId?.toLowerCase().includes(q) ?? false)
    )
  })
})

function levelClass(level: string) {
  switch (level) {
    case 'error':
      return 'lvl-error'
    case 'warn':
      return 'lvl-warn'
    case 'info':
      return 'lvl-info'
    case 'debug':
    case 'verbose':
    case 'silly':
      return 'lvl-debug'
    default:
      return 'lvl-info'
  }
}

function mergeEntries(entries: DevLogEntry[]) {
  if (entries.length === 0) return
  const byId = new Map(logs.value.map((e) => [e.id, e]))
  for (const entry of entries) {
    byId.set(entry.id, entry)
    lastEventId = entry.id
  }
  logs.value = [...byId.values()].sort((a, b) => a.id - b.id).slice(-1000)
}

function flushPending() {
  if (pending.length === 0) return
  mergeEntries(pending)
  pending = []
}

function onScroll() {
  const el = listEl.value
  if (!el) return
  const distance = el.scrollHeight - el.scrollTop - el.clientHeight
  stickToBottom.value = distance < 40
}

async function scrollToBottom() {
  await nextTick()
  const el = listEl.value
  if (el && stickToBottom.value) {
    el.scrollTop = el.scrollHeight
  }
}

watch(filtered, () => {
  void scrollToBottom()
})

function clearLocal() {
  logs.value = []
  pending = []
  expandedId.value = null
}

function togglePause() {
  paused.value = !paused.value
  if (paused.value) {
    status.value = 'paused'
  } else {
    flushPending()
    status.value = abort ? 'live' : 'connecting'
    void scrollToBottom()
  }
}

function disconnect() {
  if (reconnectTimer != null) {
    clearTimeout(reconnectTimer)
    reconnectTimer = undefined
  }
  abort?.abort()
  abort = null
}

function handleLogData(data: string) {
  try {
    const entry = JSON.parse(data) as DevLogEntry
    if (paused.value) {
      pending.push(entry)
      return
    }
    mergeEntries([entry])
  } catch {
    // ignore malformed frames
  }
}

function parseSseBuffer(buffer: string): { rest: string; frames: { event: string; data: string; id?: string }[] } {
  const frames: { event: string; data: string; id?: string }[] = []
  let start = 0
  let event = 'message'
  let data = ''
  let id: string | undefined

  const flush = () => {
    if (data.length > 0) {
      frames.push({
        event,
        data: data.endsWith('\\n') ? data.slice(0, -1) : data,
        id,
      })
    }
    event = 'message'
    data = ''
    id = undefined
  }

  while (true) {
    const nl = buffer.indexOf('\\n', start)
    if (nl === -1) break
    let line = buffer.slice(start, nl)
    start = nl + 1
    if (line.endsWith('\\r')) line = line.slice(0, -1)
    if (line === '') {
      flush()
      continue
    }
    if (line.startsWith(':')) continue
    const colon = line.indexOf(':')
    const field = colon === -1 ? line : line.slice(0, colon)
    let value = colon === -1 ? '' : line.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    if (field === 'event') event = value
    else if (field === 'data') data += value + '\\n'
    else if (field === 'id') id = value
  }

  return { rest: buffer.slice(start), frames }
}

async function readStream(signal: AbortSignal) {
  const headers: Record<string, string> = { Accept: 'text/event-stream' }
  if (lastEventId !== undefined) {
    headers['Last-Event-ID'] = String(lastEventId)
  }
  const res = await fetch(API_BASE + '/dev/logs/stream', {
    headers,
    signal,
    credentials: 'omit',
  })
  if (!res.ok) {
    throw new Error(
      res.status === 403
        ? 'Dev logs disabled (DEPLOYMENT_NAME must be development)'
        : 'Stream HTTP ' + res.status,
    )
  }
  if (!paused.value) status.value = 'live'
  errorMessage.value = ''

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parsed = parseSseBuffer(buffer)
    buffer = parsed.rest
    for (const frame of parsed.frames) {
      if (frame.event === 'log') handleLogData(frame.data)
    }
  }
}

function scheduleReconnect() {
  if (abort?.signal.aborted) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined
    void connectStream()
  }, 2000)
}

async function connectStream() {
  disconnect()
  const controller = new AbortController()
  abort = controller
  if (!paused.value) status.value = 'connecting'

  try {
    await readStream(controller.signal)
    if (!controller.signal.aborted) {
      status.value = 'connecting'
      scheduleReconnect()
    }
  } catch (err) {
    if (controller.signal.aborted) return
    status.value = 'error'
    errorMessage.value =
      err instanceof Error ? err.message : 'Stream failed'
    scheduleReconnect()
  }
}

async function loadSnapshotAndStream() {
  disconnect()
  status.value = 'connecting'
  errorMessage.value = ''
  try {
    const res = await fetch(API_BASE + '/dev/logs', { credentials: 'omit' })
    if (!res.ok) {
      status.value = 'error'
      errorMessage.value =
        res.status === 403
          ? 'Dev logs disabled (DEPLOYMENT_NAME must be development)'
          : 'Failed to load logs: HTTP ' + res.status
      return
    }
    const body = (await res.json()) as { logs: DevLogEntry[] }
    mergeEntries(body.logs ?? [])
    await connectStream()
    await scrollToBottom()
  } catch (err) {
    status.value = 'error'
    errorMessage.value =
      err instanceof Error ? err.message : 'Failed to reach ' + API_BASE + '/dev/logs'
  }
}

onMounted(() => {
  void loadSnapshotAndStream()
})

onUnmounted(() => {
  disconnect()
})
</script>

<template>
  <div class="wrap">
    <header class="toolbar">
      <div class="title">
        <span class="dot" :class="status" />
        <strong>Server logs</strong>
        <span class="meta">{{ filtered.length }} / {{ logs.length }}</span>
        <span v-if="errorMessage" class="err">{{ errorMessage }}</span>
      </div>
      <div class="controls">
        <input v-model="filter" class="input" type="search" placeholder="Filter…" />
        <select v-model="levelFilter" class="input">
          <option v-for="lvl in levelOptions" :key="lvl" :value="lvl">{{ lvl }}</option>
        </select>
        <button class="btn" type="button" @click="togglePause">
          {{ paused ? 'Resume' : 'Pause' }}
        </button>
        <button class="btn" type="button" @click="clearLocal">Clear</button>
        <button class="btn" type="button" @click="loadSnapshotAndStream">Reload</button>
      </div>
    </header>
    <div ref="listEl" class="list" @scroll="onScroll">
      <div
        v-for="entry in filtered"
        :key="entry.id"
        class="entry"
        :class="[levelClass(entry.level), { expandable: entry.meta !== undefined, open: expandedId === entry.id }]"
        @click="toggleExpand(entry)"
      >
        <div class="row">
          <span class="ts">{{ entry.timestamp || '' }}</span>
          <span class="lvl">{{ entry.level }}</span>
          <span class="ctx" :title="entry.subsystem_name || ''">
            {{ entry.operation_name || entry.subsystem_name || '' }}
          </span>
          <span class="msg">
            <span class="msg-text">{{ entry.message }}</span>
            <span v-if="entry.meta !== undefined && expandedId !== entry.id" class="meta-preview">
              {{ metaPreview(entry.meta) }}
            </span>
          </span>
        </div>
        <pre v-if="entry.meta !== undefined && expandedId === entry.id" class="meta-full">{{ metaPretty(entry.meta) }}</pre>
      </div>
      <div v-if="filtered.length === 0" class="empty">
        No log entries yet.
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  color: #e5e7eb;
  background: #0b1220;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-bottom: 1px solid #1f2937;
  background: #111827;
}
.title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.meta {
  color: #9ca3af;
}
.err {
  color: #fca5a5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.input {
  background: #0b1220;
  border: 1px solid #374151;
  color: #e5e7eb;
  border-radius: 4px;
  padding: 4px 8px;
  min-width: 100px;
}
.btn {
  background: #1f2937;
  border: 1px solid #374151;
  color: #e5e7eb;
  border-radius: 4px;
  padding: 4px 10px;
  cursor: pointer;
}
.btn:hover {
  background: #374151;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6b7280;
  flex-shrink: 0;
}
.dot.live { background: #34d399; }
.dot.connecting { background: #fbbf24; }
.dot.error { background: #f87171; }
.dot.paused { background: #60a5fa; }
.list {
  flex: 1;
  overflow: auto;
  padding: 4px 0;
}
.entry {
  border-bottom: 1px solid #111827;
}
.entry.expandable {
  cursor: pointer;
}
.entry.expandable:hover,
.entry.open {
  background: #111827;
}
.row {
  display: grid;
  grid-template-columns: 11ch 52px minmax(80px, 160px) 1fr;
  gap: 8px;
  padding: 2px 10px;
  align-items: baseline;
}
.ts {
  color: #6b7280;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.lvl { font-weight: 600; text-transform: uppercase; font-size: 10px; }
.ctx { color: #9ca3af; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.msg {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.meta-preview {
  margin-left: 0.6em;
  color: #6b7280;
  font-weight: 400;
}
.meta-full {
  margin: 0;
  padding: 6px 10px 10px calc(11ch + 52px + 160px + 34px);
  color: #9ca3af;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 11px;
  line-height: 1.35;
}
.lvl-error .lvl, .lvl-error .msg-text { color: #fca5a5; }
.lvl-warn .lvl, .lvl-warn .msg-text { color: #fcd34d; }
.lvl-info .lvl { color: #93c5fd; }
.lvl-debug .lvl, .lvl-debug .msg-text { color: #a78bfa; }
.empty {
  padding: 24px;
  text-align: center;
  color: #6b7280;
}
</style>
`;

  addCustomTab({
    name: "saf-dev-logs",
    title: "Server Logs",
    icon: "i-carbon-document",
    category: "app",
    view: {
      type: "sfc",
      sfc,
    },
  });
}
