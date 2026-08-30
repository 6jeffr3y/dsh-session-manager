import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import * as plugin from '../lib/index.js'
import {
  improveTitleOptions,
  parseState,
  SessionManager,
  SessionManagerState,
  sessionRows,
  setArchived,
  streamImprovedTitle,
} from '../lib/index.js'

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

test('state metadata is written atomically and removed when empty', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-session-manager-'))
  try {
    const state = new SessionManagerState(root)
    await state.load()
    await state.update('session-one', () => ({ favorite: true, tags: ['SRC', '待复测'] }))
    assert.deepEqual(state.get('session-one'), { favorite: true, tags: ['SRC', '待复测'] })
    assert.deepEqual(parseState(JSON.parse(await readFile(join(root, 'state.json'), 'utf8'))), {
      version: 1,
      sessions: { 'session-one': { favorite: true, tags: ['SRC', '待复测'] } },
      pendingDeletions: [],
    })
    await state.update('session-one', () => ({ favorite: false, tags: [] }))
    assert.deepEqual(state.get('session-one'), { favorite: false, tags: [] })
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
  }).sessions.s.tags, ['alpha', 'beta'])
  assert.deepEqual(parseState({ version: 1, sessions: {} }).pendingDeletions, [])
  assert.deepEqual(parseState({ version: 1, sessions: {}, pendingDeletions: ['s', 's'] }).pendingDeletions, ['s'])
})

test('rows combine DSH title projections with archive, favorite and tags', () => {
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
  }], ['session-a'], {
    get(id) { return id === 'session-a' ? { favorite: true, tags: ['重要'] } : { favorite: false, tags: [] } },
    isDeletionPending(id) { return id === 'session-b' },
  })
  assert.deepEqual(rows[0], {
    sessionId: 'session-a', title: '自然标题', createdAt: 10, updatedAt: 20, cwd: '/work',
    running: false, archived: true, favorite: true, tags: ['重要'],
    pendingDeletion: false,
  })
  assert.equal(rows[1].title, 'session-b')
  assert.equal(rows[1].cwd, null)
  assert.equal(rows[1].pendingDeletion, true)
})

test('title improvement replaces a frozen title request without mutating it', () => {
  const title = Object.freeze({ purpose: 'session-title', reasoningEffort: 'max', model: 'glm' })
  const ordinary = { purpose: 'agent', reasoningEffort: 'max' }
  const improved = improveTitleOptions(title)
  assert.deepEqual(improved, { purpose: 'session-title', reasoningEffort: 'off', model: 'glm' })
  assert.equal(Object.isFrozen(improved), true)
  assert.equal(title.reasoningEffort, 'max')
  assert.equal(improveTitleOptions(improved), undefined)
  assert.equal(improveTitleOptions(ordinary), undefined)
  assert.equal(ordinary.reasoningEffort, 'max')
})

test('title improvement re-enters the LLM waterfall once and delegates the rewritten request', () => {
  const calls = []
  const next = () => { calls.push('next'); return 'delegated' }
  const ctx = {
    llm: {
      stream(options) {
        calls.push(options)
        return streamImprovedTitle(ctx, options, next)
      },
    },
  }
  const result = streamImprovedTitle(ctx, Object.freeze({ purpose: 'session-title' }), next)
  assert.equal(result, 'delegated')
  assert.equal(calls.length, 2)
  assert.equal(calls[0].reasoningEffort, 'off')
  assert.equal(calls[1], 'next')
})

test('restore uses the registry mutation chain and preserves other global fields', async () => {
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
      sessionPersistence: { list: async () => [] },
      logger: { warn() {} },
    }
    await new SessionManager(ctx, state).finalizePendingDeletions()
    assert.equal(state.isDeletionPending('session-a'), false)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('permanent deletion removes only an archived cold JSONL session and its derived metadata', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-session-delete-'))
  try {
    const state = new SessionManagerState(join(root, 'manager'))
    await state.load()
    await state.update('session-a', () => ({ favorite: true, tags: ['important'] }))
    const sessionDirectory = join(root, 'sessions', 'session-a')
    await mkdir(sessionDirectory, { recursive: true })
    await writeFile(join(sessionDirectory, 'session.jsonl.zstd'), 'fixture')

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
    const ctx = {
      workspaceRegistry: registry,
      sessions: { get: () => undefined },
      agents: { get: () => undefined },
      sessionPersistence: {
        list: async () => [{ id: 'session-a', createdAt: 1, cwd: root }],
        locate: () => ({ kind: 'jsonl', path: join(sessionDirectory, 'session.jsonl.zstd') }),
      },
      storageDomain: { get: () => ({ table: () => ({ delete: async id => { deletedProjections.push(id); return true } }) }) },
      emit: (...args) => { emitted.push(args) },
      logger: { warn() {} },
    }
    const result = await new SessionManager(ctx, state).delete({ sessionId: 'session-a', confirmation: 'session-a' })
    assert.deepEqual(result, { ok: true, value: { sessionId: 'session-a', deleted: true, memoryPreserved: true } })
    await assert.rejects(readFile(join(sessionDirectory, 'session.jsonl.zstd')), error => error.code === 'ENOENT')
    assert.deepEqual(registry.archivedSessionIds, [])
    assert.deepEqual(workspace.sessionIds, ['session-b'])
    assert.deepEqual(state.get('session-a'), { favorite: false, tags: [] })
    assert.deepEqual(deletedProjections, ['session-a'])
    assert.deepEqual(emitted, [['api-session/removed', 'session-a']])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
