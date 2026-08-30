import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

async function loadClientModule() {
  let descriptor
  const appended = []
  const context = vm.createContext({
    window: { __ModuleLoader__: { load(value) { descriptor = value } } },
    document: {
      querySelector: () => null,
      createElement: () => ({ dataset: {}, textContent: '' }),
      head: { appendChild: value => { appended.push(value) } },
      body: {},
    },
    console,
    Intl,
    URLSearchParams,
    Set,
    Map,
    setTimeout,
    clearTimeout,
  })
  vm.runInContext(await readFile(new URL('../lib/client.js', import.meta.url), 'utf8'), context)
  assert.equal(descriptor.id, 'dsh-plugin-session-manager')

  const react = {
    createElement() {},
    Fragment: Symbol('Fragment'),
    useState() {},
    useCallback() {},
    useEffect() {},
  }
  const plugin = descriptor.factory(id => id === 'react' ? react : { createPortal() {} })
  return { appended, plugin }
}

test('client bundle registers one additive sidebar footer action', async () => {
  const { appended, plugin } = await loadClientModule()
  const registrations = []
  const dictionaries = []
  const ctx = {
    connection: { rpc: { call: async (_channel, endpoint) => {
      assert.equal(endpoint, 'options')
      return { ok: true, value: { autoLoadFullHistory: true } }
    } } },
    sessions: {
      list: { getSnapshot: () => ({ current: undefined }), subscribe: () => () => {} },
      binding: () => undefined,
    },
    locale: { register: (namespace, value) => { dictionaries.push([namespace, value]); return () => {} } },
    effect: install => install(),
    slots: {
      inject: (name, install) => { assert.equal(name, 'sidebar.footer.action'); install() },
      register: (options, component) => { registrations.push([options, component]); return () => {} },
    },
  }
  plugin.apply(ctx)
  assert.equal(appended.length, 1)
  assert.equal(dictionaries[0][0], 'session-manager')
  assert.equal(registrations.length, 1)
  assert.deepEqual(
    { name: registrations[0][0].name, id: registrations[0][0].id, locale: registrations[0][0].locale },
    { name: 'sidebar.footer.action', id: 'session-manager', locale: 'session-manager' },
  )
  assert.equal(typeof registrations[0][1], 'function')
  assert.deepEqual(Array.from(plugin.inject), ['slots', 'locale', 'connection', 'sessions', 'workspaces', 'uiWorkspace'])
})

test('selected-session history loader drains every older page and then stops', async () => {
  const { plugin } = await loadClientModule()
  const listeners = new Set()
  let calls = 0
  let state = { openState: 'open', loadingOlder: false, hasMore: true }
  let window = { revision: 1, entries: [{ event: 1 }], hasMore: true }
  const notify = () => { for (const listener of listeners) listener() }
  const binding = {
    sessionId: 'session-a',
    eventSource: { getSnapshot: () => window },
    session: {
      getSnapshot: () => state,
      subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
      async loadOlder() {
        calls += 1
        state = { ...state, loadingOlder: true }
        notify()
        const hasMore = calls < 3
        window = {
          revision: window.revision + 1,
          entries: [{ event: `page-${calls}` }, ...window.entries],
          hasMore,
        }
        state = { openState: 'open', loadingOlder: false, hasMore }
        notify()
      },
    },
  }
  const dispose = plugin.createHistoryDrainController(binding)
  for (let attempt = 0; attempt < 100 && calls < 3; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 1))
  }
  assert.equal(calls, 3)
  assert.equal(window.entries.length, 4)
  dispose()
  notify()
  assert.equal(calls, 3)
})

test('selected-session history loader stops when an older page makes no progress', async () => {
  const { plugin } = await loadClientModule()
  let calls = 0
  const state = { openState: 'open', loadingOlder: false, hasMore: true }
  const window = { revision: 5, entries: [{ event: 1 }], hasMore: true }
  const binding = {
    sessionId: 'session-stalled',
    eventSource: { getSnapshot: () => window },
    session: {
      getSnapshot: () => state,
      subscribe: () => () => {},
      async loadOlder() { calls += 1 },
    },
  }
  const dispose = plugin.createHistoryDrainController(binding)
  await new Promise(resolve => setTimeout(resolve, 5))
  assert.equal(calls, 1)
  dispose()
})

test('existing tag helpers add, remove, deduplicate and enforce the eight-tag limit', async () => {
  const { plugin } = await loadClientModule()
  assert.deepEqual(Array.from(plugin.parseTagDraft(' SRC, 待复测，SRC ,, 高价值 ')), ['SRC', '待复测', '高价值'])
  assert.equal(plugin.toggleTagDraft('SRC', '待复测'), 'SRC, 待复测')
  assert.equal(plugin.toggleTagDraft('SRC, 待复测', 'SRC'), '待复测')
  assert.equal(plugin.toggleTagDraft('1, 2, 3, 4, 5, 6, 7, 8', '9'), '1, 2, 3, 4, 5, 6, 7, 8')
})

test('relationship graph uses exact tags only and excludes archived or untagged sessions', async () => {
  const { plugin } = await loadClientModule()
  const graph = plugin.buildSessionGraph([{
    sessionId: 'session-a', title: 'Alpha', tags: ['SRC', '复测'], favorite: true, archived: false,
  }, {
    sessionId: 'session-b', title: 'B'.repeat(30), tags: ['SRC'], favorite: false, archived: false,
  }, {
    sessionId: 'session-c', title: 'No tags', tags: [], favorite: false, archived: false,
  }, {
    sessionId: 'session-d', title: 'Archived', tags: ['SRC'], favorite: false, archived: true,
  }])
  const nodes = Array.from(graph.nodes)
  const links = Array.from(graph.links)
  assert.equal(nodes.filter(node => node.kind === 'session').length, 2)
  assert.deepEqual(nodes.filter(node => node.kind === 'tag').map(node => node.tag), ['SRC', '复测'])
  assert.equal(nodes.some(node => node.id === 'favorite'), false)
  assert.equal(nodes.some(node => node.id === 'session:session-c'), false)
  assert.equal(nodes.some(node => node.id === 'session:session-d'), false)
  assert.deepEqual(links.map(link => `${link.source}->${link.target}`).sort(), [
    'session:session-a->tag:SRC',
    'session:session-a->tag:复测',
    'session:session-b->tag:SRC',
  ])
  assert.equal(nodes.find(node => node.id === 'session:session-b').shortLabel.endsWith('…'), true)
  assert.equal(nodes.find(node => node.id === 'tag:SRC').count, 2)
  assert.equal(nodes.every(node => Number.isFinite(node.x) && Number.isFinite(node.y)), true)
})

test('archive uses the official UI Workspace service', async () => {
  const { plugin } = await loadClientModule()
  const archived = []
  await plugin.archiveManagedSession({
    uiWorkspace: { archiveSession: async sessionId => { archived.push(sessionId) } },
  }, 'session-a')
  assert.deepEqual(archived, ['session-a'])
})

test('title navigation restores an archived session before opening it', async () => {
  const { plugin } = await loadClientModule()
  let snapshot = { archivedSessionIds: ['session-a'] }
  const listeners = new Set()
  const calls = []
  const opened = []
  const client = {
    connection: {
      rpc: {
        call: async (channel, endpoint, payload) => {
          calls.push([channel, endpoint, payload])
          setTimeout(() => {
            snapshot = { archivedSessionIds: [] }
            for (const listener of listeners) listener()
          }, 0)
          return { ok: true, value: { restored: true } }
        },
      },
    },
    sessions: { open: sessionId => { opened.push(sessionId) } },
    workspaces: {
      list: {
        getSnapshot: () => snapshot,
        subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
      },
    },
  }
  await plugin.openManagedSession(client, { sessionId: 'session-a', archived: true })
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [['/session-manager', 'restore', { sessionId: 'session-a' }]])
  assert.deepEqual(opened, ['session-a'])
})
