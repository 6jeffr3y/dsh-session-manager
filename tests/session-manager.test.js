import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import * as plugin from '../lib/index.js'
import {
  parseState,
  SessionManager,
  SessionManagerState,
  sessionRows,
  setArchived,
} from '../lib/index.js'
import { registerSessionTools } from '../lib/tools.js'

test('host module keeps Cordis metadata on the loader-visible plugin object', () => {
  assert.equal(plugin.default, undefined)
  assert.equal(plugin.name, 'session-manager')
  assert.ok(plugin.inject.includes('connection'))
  assert.equal(plugin.apply instanceof Function, true)
})

test('client options expose the configured full-history policy', async () => {
  const manager = new SessionManager({}, {}, { autoLoadFullHistory: false })
  assert.deepEqual(await manager.dispatch('options', {}), {
    ok: true,
    value: { autoLoadFullHistory: false },
  })
})

test('model tools register unit-tag metadata, relation and bounded report operations', async () => {
  const tools = []
  const calls = []
  const ctx = {
    tools: { register: tool => { tools.push(tool); return () => {} } },
    effect: install => install(),
  }
  const manager = {
    getMetadata: async () => ({ favorite: false, unitTags: ['existing'], developer: '', outcomeTypes: [] }),
    metadata: async payload => {
      calls.push(['metadata', payload])
      return { ok: true, value: payload }
    },
    related: async (sessionId, filters) => {
      calls.push(['related', sessionId, filters])
      return []
    },
    readReports: async (sourceId, targetId, options) => {
      calls.push(['reports', sourceId, targetId, options])
      return { files: [] }
    },
  }
  registerSessionTools(ctx, manager)
  assert.deepEqual(tools.map(tool => tool.name), ['session_tag', 'session_related', 'session_reports'])

  const exec = { agent: { session: { header: { id: 'source' } } }, signal: undefined }
  await tools[0].execute({ add_unit_tags: ['target'], add_outcome_types: ['RCE'] }, exec)
  assert.deepEqual(calls[0], ['metadata', {
    sessionId: 'source',
    unitTags: ['existing', 'target'],
    outcomeTypes: ['RCE'],
  }])
  await tools[1].execute({ unit_tag: 'target', limit: 5 }, exec)
  assert.deepEqual(calls[1], ['related', 'source', {
    unitTag: 'target',
    developer: undefined,
    outcomeType: undefined,
    limit: 5,
  }])
  await tools[2].execute({ session_id: 'target', max_files: 2 }, exec)
  assert.deepEqual(calls[2], ['reports', 'source', 'target', { session_id: 'target', max_files: 2 }])
})

test('state metadata is written atomically and removed when empty', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-session-manager-'))
  try {
    const state = new SessionManagerState(root)
    await state.load()
    await state.update('session-one', () => ({ favorite: true, unitTags: ['SRC', '待复测'] }))
    assert.deepEqual(state.get('session-one'), {
      favorite: true, unitTags: ['SRC', '待复测'], developer: '', outcomeTypes: [],
    })
    assert.deepEqual(parseState(JSON.parse(await readFile(join(root, 'state.json'), 'utf8'))), {
      version: 3,
      sessions: { 'session-one': { favorite: true, unitTags: ['SRC', '待复测'], developer: '', outcomeTypes: [] } },
      pendingDeletions: [],
    })
    await state.update('session-one', () => ({ favorite: false, unitTags: [] }))
    assert.deepEqual(state.get('session-one'), {
      favorite: false, unitTags: [], developer: '', outcomeTypes: [],
    })
    assert.deepEqual(JSON.parse(await readFile(join(root, 'state.json'), 'utf8')).sessions, {})
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('state parsing rejects oversized and duplicate-independent tag input', () => {
  assert.throws(() => parseState({
    version: 1,
    sessions: { s: { favorite: false, tags: Array.from({ length: 9 }, (_, i) => `t${i}`) } },
  }), /at most 8/)
  assert.deepEqual(parseState({
    version: 1,
    sessions: { s: { favorite: false, tags: [' alpha ', 'alpha', 'beta'] } },
  }).sessions.s.unitTags, ['alpha', 'beta'])
  assert.deepEqual(parseState({ version: 1, sessions: {} }).pendingDeletions, [])
  assert.deepEqual(parseState({ version: 1, sessions: {}, pendingDeletions: ['s', 's'] }).pendingDeletions, ['s'])
})

test('rows combine DSH title projections with archive, pin state and tags', () => {
  const rows = sessionRows([{
    sessionId: 'session-a',
    createdAt: 10,
    updatedAt: 20,
    cwd: '/work',
    running: false,
    projections: { values: { title: '自然标题' } },
  }, {
    sessionId: 'session-b',
    createdAt: 11,
    updatedAt: 21,
    running: true,
  }], ['session-a'], ['session-b'], {
    get(id) { return id === 'session-a' ? { favorite: false, unitTags: ['重要'] } : { favorite: false, unitTags: [] } },
    isDeletionPending(id) { return id === 'session-b' },
  })
  assert.deepEqual(rows[0], {
    sessionId: 'session-a', title: '自然标题', createdAt: 10, updatedAt: 20, cwd: '/work',
    running: false, archived: true, pinned: false, unitTags: ['重要'], developer: '', outcomeTypes: [],
    pendingDeletion: false,
  })
  assert.equal(rows[1].pinned, true)
  assert.equal(rows[1].title, 'session-b')
  assert.equal(rows[1].cwd, null)
  assert.equal(rows[1].pendingDeletion, true)
})

test('related sessions use unit, developer and exact target tags, not outcome-only matches', async () => {
  const metadata = {
    a: { favorite: false, unitTags: ['target-a'], developer: 'Dev A', outcomeTypes: ['RCE'] },
    b: { favorite: false, unitTags: ['target-a'], developer: '', outcomeTypes: ['SQLI'] },
    c: { favorite: false, unitTags: ['target-b'], developer: '', outcomeTypes: [] },
    d: { favorite: false, unitTags: [], developer: 'Dev A', outcomeTypes: [] },
    e: { favorite: false, unitTags: [], developer: '', outcomeTypes: ['RCE'] },
  }
  const items = Object.keys(metadata).map((sessionId, index) => ({
    sessionId,
    updatedAt: index + 1,
    running: false,
    projections: { values: { title: sessionId } },
  }))
  const manager = new SessionManager({
    sessionController: { list: async () => ({ items }) },
    sessionPersistence: { list: async () => items.map(({ sessionId }) => ({ header: { id: sessionId, createdAt: 1 } })) },
    workspaceRegistry: { archivedSessionIds: [], pinnedSessionIds: [] },
  }, {
    get: sessionId => metadata[sessionId],
    isDeletionPending: () => false,
  })
  const related = await manager.related('a', {}, new AbortController().signal)
  assert.deepEqual(related.map(row => row.sessionId).sort(), ['b', 'd'])
  assert.equal(related.find(row => row.sessionId === 'b').relationReasons.includes('unitTag:target-a'), true)
  assert.equal(related.find(row => row.sessionId === 'd').relationReasons.includes('developer:Dev A'), true)
  const filtered = await manager.related('a', { unitTag: 'target-a' }, new AbortController().signal)
  assert.deepEqual(filtered.map(row => row.sessionId), ['b'])
})

test('report reading accepts related sessions and is bounded to target metadata', async () => {
  const metadata = {
    a: { favorite: false, unitTags: ['target-a'], developer: '', outcomeTypes: [] },
    b: { favorite: false, unitTags: ['target-a'], developer: '', outcomeTypes: [] },
    c: { favorite: false, unitTags: ['target-b'], developer: '', outcomeTypes: [] },
  }
  const items = Object.keys(metadata).map((sessionId, index) => ({
    sessionId, updatedAt: index + 1, running: false, cwd: '/target',
  }))
  const targets = {
    '/target': { type: 'directory' },
    '/target/reports': { type: 'directory' },
    '/target/reports/finding.md': { type: 'file', size: 12 },
  }
  const files = { '/target/reports/finding.md': '# finding\nRCE' }
  const fs = {
    resolve: async path => ({ targetKey: path, displayPath: path }),
    lstat: async path => targets[path],
    stat: async target => targets[target.targetKey],
    listDir: async target => target.targetKey === '/target'
      ? [{ name: 'reports', type: 'directory', target: { targetKey: '/target/reports', displayPath: '/target/reports' } }]
      : target.targetKey === '/target/reports'
        ? [{ name: 'finding.md', type: 'file', size: 12, target: { targetKey: '/target/reports/finding.md', displayPath: '/target/reports/finding.md' } }]
        : [],
    readText: async target => files[target.targetKey],
  }
  const manager = new SessionManager({
    fs,
    sessionController: { list: async () => ({ items }) },
    sessionPersistence: { list: async () => items.map(({ sessionId }) => ({ header: { id: sessionId, createdAt: 1 } })) },
    workspaceRegistry: { archivedSessionIds: [], pinnedSessionIds: [] },
  }, {
    get: sessionId => metadata[sessionId],
    isDeletionPending: () => false,
  })
  const report = await manager.readReports('a', 'b', {}, new AbortController().signal)
  assert.equal(report.files.length, 1)
  assert.equal(report.files[0].path.endsWith('finding.md'), true)
  assert.match(report.files[0].excerpt, /RCE/)
  await assert.rejects(manager.readReports('a', 'c', {}, new AbortController().signal), /not related/)
})

test('archive changes prefer the official Workspace service', async () => {
  const calls = []
  const registry = {
    async archiveSession(sessionId) { calls.push(['archive', sessionId]) },
    async unarchiveSession(sessionId) { calls.push(['unarchive', sessionId]) },
  }
  await setArchived({ workspaceRegistry: registry }, 's1', true)
  await setArchived({ workspaceRegistry: registry }, 's1', false)
  assert.deepEqual(calls, [['archive', 's1'], ['unarchive', 's1']])
})

test('archive changes fall back to the registry mutation chain on older DSH releases', async () => {
  const writes = []
  const registry = {
    state: { initialized: true, workspaceIds: ['w'], archivedSessionIds: ['s1', 's2'] },
    requireState() { return this.state },
    async setState(next) { this.state = next; writes.push(next) },
    async enqueueOperation(operation) { return await operation() },
  }
  await setArchived({ workspaceRegistry: registry }, 's1', false)
  assert.deepEqual(registry.state, { initialized: true, workspaceIds: ['w'], archivedSessionIds: ['s2'] })
  assert.equal(writes.length, 1)
})

test('permanent deletion refuses a missing second confirmation before touching storage', async () => {
  const ctx = {
    workspaceRegistry: { archivedSessionIds: ['session-a'] },
  }
  const manager = new SessionManager(ctx, {})
  const result = await manager.delete({ sessionId: 'session-a', confirmation: 'wrong' })
  assert.deepEqual(result, {
    ok: false,
    error: {
      code: 'confirmation-required',
      message: 'permanent deletion requires the exact session id',
      details: { sessionId: 'session-a' },
    },
  })
})

test('permanent deletion queues an archived idle session that is still mounted', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-session-queue-'))
  try {
    const state = new SessionManagerState(root)
    await state.load()
    const ctx = {
      workspaceRegistry: { archivedSessionIds: ['session-a'] },
      sessions: { get: id => id === 'session-a' ? {} : undefined },
      agents: { get: () => undefined },
    }
    const result = await new SessionManager(ctx, state).delete({ sessionId: 'session-a', confirmation: 'session-a' })
    assert.deepEqual(result, {
      ok: true,
      value: { sessionId: 'session-a', deleted: false, pendingRestart: true, memoryPreserved: true },
    })
    assert.equal(state.isDeletionPending('session-a'), true)
    assert.deepEqual(JSON.parse(await readFile(join(root, 'state.json'), 'utf8')).pendingDeletions, ['session-a'])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('permanent deletion refuses a session whose agent is running', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-session-running-'))
  try {
    const state = new SessionManagerState(root)
    await state.load()
    const ctx = {
      workspaceRegistry: { archivedSessionIds: ['session-a'] },
      sessions: { get: () => ({}) },
      agents: { get: () => ({ status: 'running' }) },
    }
    const result = await new SessionManager(ctx, state).delete({ sessionId: 'session-a', confirmation: 'session-a' })
    assert.deepEqual(result, {
      ok: false,
      error: {
        code: 'session-running',
        message: 'a running session cannot be permanently deleted',
        details: { sessionId: 'session-a' },
      },
    })
    assert.equal(state.isDeletionPending('session-a'), false)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('startup drops a pending deletion whose session artifact is already absent', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-session-finalize-'))
  try {
    const state = new SessionManagerState(root)
    await state.load()
    await state.queueDeletion('session-a')
    const ctx = {
      sessions: { get: () => undefined },
      agents: { get: () => undefined },
      sessionPersistence: { stat: async () => undefined },
      logger: { warn() {} },
    }
    await new SessionManager(ctx, state).finalizePendingDeletions()
    assert.equal(state.isDeletionPending('session-a'), false)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

for (const filename of ['session.jsonl.zstd', 'session.v4.jsonl', 'session.v4.jsonl.zstd']) {
test(`permanent deletion removes the archived cold session containing ${filename}`, async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-session-delete-'))
  try {
    const state = new SessionManagerState(join(root, 'manager'))
    await state.load()
    await state.update('session-a', () => ({ favorite: true, unitTags: ['important'] }))
    const sessionDirectory = join(root, 'sessions', 'session-a')
    await mkdir(sessionDirectory, { recursive: true })
    await writeFile(join(sessionDirectory, filename), 'fixture')

    const workspace = {
      sessionIds: ['session-a', 'session-b'],
      async detachSession(id) { this.sessionIds = this.sessionIds.filter(value => value !== id) },
      async attachSession(id) { if (!this.sessionIds.includes(id)) this.sessionIds.unshift(id) },
      async insertSessionBefore(id, before) {
        this.sessionIds = this.sessionIds.filter(value => value !== id)
        this.sessionIds.splice(this.sessionIds.indexOf(before), 0, id)
      },
    }
    const registry = {
      state: { initialized: true, workspaceIds: ['w'], archivedSessionIds: ['session-a'] },
      get archivedSessionIds() { return this.state.archivedSessionIds },
      list() { return [workspace] },
      requireState() { return this.state },
      async setState(next) { this.state = next },
      async enqueueOperation(operation) { return await operation() },
    }
    const deletedProjections = []
    const emitted = []
    const historical = filename === 'session.jsonl.zstd'
    const ctx = {
      workspaceRegistry: registry,
      sessions: { get: () => undefined },
      agents: { get: () => undefined },
      sessionPersistence: {
        stat: async () => ({
          header: { id: 'session-a', createdAt: 1, cwd: root },
          revision: 'fixture',
          formatStatus: historical ? 'migration-required' : 'current',
          ...(historical ? { location: { kind: 'jsonl', path: join(sessionDirectory, filename) } } : {}),
        }),
        resolveCurrentLog: async () => historical ? undefined : join(sessionDirectory, filename),
      },
      storageDomain: { get: () => ({ table: () => ({ delete: async id => { deletedProjections.push(id); return true } }) }) },
      emit: (...args) => { emitted.push(args) },
      logger: { warn() {} },
    }
    const result = await new SessionManager(ctx, state).delete({ sessionId: 'session-a', confirmation: 'session-a' })
    assert.deepEqual(result, { ok: true, value: { sessionId: 'session-a', deleted: true, memoryPreserved: true } })
    await assert.rejects(readFile(join(sessionDirectory, filename)), error => error.code === 'ENOENT')
    assert.deepEqual(registry.archivedSessionIds, [])
    assert.deepEqual(workspace.sessionIds, ['session-b'])
    assert.deepEqual(state.get('session-a'), {
      favorite: false, unitTags: [], developer: '', outcomeTypes: [],
    })
    assert.deepEqual(deletedProjections, ['session-a'])
    assert.deepEqual(emitted, [['api-session/removed', 'session-a']])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
}

test('list reads snapshot headers and forwards cancellation through the new options object', async () => {
  const signal = new AbortController().signal
  const ctx = {
    sessionController: { list: async (request, received) => {
      assert.deepEqual(request, {})
      assert.equal(received, signal)
      return { items: [{ sessionId: 'cold', updatedAt: 9, running: false }] }
    } },
    sessionPersistence: { list: async options => {
      assert.equal(options.signal, signal)
      return [{ header: { id: 'cold', createdAt: 3 }, revision: 'fixture' }]
    } },
    workspaceRegistry: { archivedSessionIds: [] },
  }
  const manager = new SessionManager(ctx, { get: () => ({ favorite: false, unitTags: [] }), isDeletionPending: () => false })
  const result = await manager.list(signal)
  assert.equal(result.value.sessions[0].createdAt, 3)
})

test('known cold sessions are resolved through stat without listing the corpus', async () => {
  const manager = new SessionManager({
    sessionPersistence: { stat: async id => id === 'cold' ? { header: { id }, revision: 'fixture' } : undefined },
    sessions: { get: id => id === 'live' ? {} : undefined },
  }, {})
  await manager.requireKnown('cold')
  await manager.requireKnown('live')
  await assert.rejects(manager.requireKnown('missing'), /was not found/)
})

test('a historical-only session is deleted from its stored generation without migration', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-session-history-delete-'))
  try {
    const state = new SessionManagerState(join(root, 'manager'))
    await state.load()
    const sessionDirectory = join(root, 'sessions', 'old')
    await mkdir(sessionDirectory, { recursive: true })
    await writeFile(join(sessionDirectory, 'session.jsonl.zstd'), 'fixture')
    const registry = {
      state: { initialized: true, workspaceIds: [], archivedSessionIds: ['old'] },
      get archivedSessionIds() { return this.state.archivedSessionIds },
      list() { return [] },
      requireState() { return this.state },
      async setState(next) { this.state = next },
      async enqueueOperation(operation) { return await operation() },
    }
    const manager = new SessionManager({
      workspaceRegistry: registry,
      sessions: { get: () => undefined },
      agents: { get: () => undefined },
      sessionPersistence: {
        stat: async () => ({
          header: { id: 'old' },
          revision: 'fixture',
          formatStatus: 'migration-required',
          location: { kind: 'jsonl', path: join(sessionDirectory, 'session.jsonl.zstd') },
        }),
        resolveCurrentLog: async () => undefined,
      },
      storageDomain: { get: () => ({ table: () => ({ delete: async () => true }) }) },
      emit() {},
      logger: { warn() {} },
    }, state)
    const result = await manager.deleteColdSession('old')
    assert.deepEqual(result, { ok: true, value: { sessionId: 'old', deleted: true, memoryPreserved: true } })
    await assert.rejects(readFile(join(sessionDirectory, 'session.jsonl.zstd')), error => error.code === 'ENOENT')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('deletion refuses an artifact outside its session directory or with a noncanonical name', async () => {
  for (const path of ['/fixture/other/session.v4.jsonl', '/fixture/cold/session.jsonl.backup', '/fixture/cold/session.v0.jsonl']) {
    const manager = new SessionManager({ sessionPersistence: {
      stat: async () => ({ header: { id: 'cold' }, revision: 'fixture' }),
      resolveCurrentLog: async () => path,
    } }, {})
    await assert.rejects(manager.deleteColdSession('cold'), /refusing unexpected session artifact/)
  }
})
