/** DSH 会话管理 Host 插件。 */
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import z from '@deepseek-ai/schemastery'

export const name = 'session-manager'
export const inject = [
  'agents',
  'connection',
  'llm',
  'sessionController',
  'sessionPersistence',
  'sessions',
  'storageDomain',
  'workspaceRegistry',
]

export const Config = z.object({
  stateDir: z.string().default(''),
  improveNonDeepSeekTitles: z.boolean().default(true),
  autoLoadFullHistory: z.boolean().default(true),
})

const CHANNEL = '/session-manager'
const STATE_VERSION = 1
const MAX_TAGS = 8
const MAX_TAG_LENGTH = 32
const SESSION_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u

function failure(code, message, details = {}) {
  return { ok: false, error: { code, message, details } }
}

function ok(value) {
  return { ok: true, value }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

function requireRecord(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('request payload must be an object')
  }
  return value
}

function requireSessionId(value) {
  if (typeof value !== 'string' || !SESSION_ID.test(value)) {
    throw new TypeError('sessionId is invalid')
  }
  return value
}

function normalizeTags(value) {
  if (!Array.isArray(value) || value.length > MAX_TAGS) {
    throw new TypeError(`tags must be an array with at most ${MAX_TAGS} entries`)
  }
  const normalized = []
  for (const raw of value) {
    if (typeof raw !== 'string') throw new TypeError('every tag must be a string')
    const tag = raw.trim()
    if (tag.length === 0 || [...tag].length > MAX_TAG_LENGTH) {
      throw new TypeError(`every tag must contain 1-${MAX_TAG_LENGTH} characters`)
    }
    if (!normalized.includes(tag)) normalized.push(tag)
  }
  return normalized
}

function emptyState() {
  return { version: STATE_VERSION, sessions: {}, pendingDeletions: [] }
}

export function parseState(value) {
  const state = requireRecord(value)
  if (state.version !== STATE_VERSION) throw new Error(`unsupported state version ${String(state.version)}`)
  const rawSessions = requireRecord(state.sessions)
  const sessions = {}
  for (const [id, raw] of Object.entries(rawSessions)) {
    requireSessionId(id)
    const entry = requireRecord(raw)
    if (typeof entry.favorite !== 'boolean') throw new TypeError(`session ${id} favorite must be boolean`)
    sessions[id] = { favorite: entry.favorite, tags: normalizeTags(entry.tags) }
  }
  const pendingDeletions = state.pendingDeletions === undefined
    ? []
    : [...new Set(normalizeSessionIds(state.pendingDeletions, 'pendingDeletions'))]
  return { version: STATE_VERSION, sessions, pendingDeletions }
}

function normalizeSessionIds(value, field) {
  if (!Array.isArray(value)) throw new TypeError(`${field} must be an array`)
  return value.map(requireSessionId)
}

export class SessionManagerState {
  constructor(directory) {
    this.directory = directory
    this.path = join(directory, 'state.json')
    this.value = emptyState()
    this.tail = Promise.resolve()
  }

  async load() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 })
    try {
      this.value = parseState(JSON.parse(await readFile(this.path, 'utf8')))
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
      await this.persist(this.value)
    }
  }

  get(sessionId) {
    return this.value.sessions[sessionId] ?? { favorite: false, tags: [] }
  }

  isDeletionPending(sessionId) {
    return this.value.pendingDeletions.includes(sessionId)
  }

  pendingDeletionIds() {
    return [...this.value.pendingDeletions]
  }

  update(sessionId, transform) {
    return this.enqueue(async () => {
      const sessions = { ...this.value.sessions }
      const next = transform(this.get(sessionId))
      if (!next.favorite && next.tags.length === 0) delete sessions[sessionId]
      else sessions[sessionId] = { favorite: next.favorite, tags: [...next.tags] }
      const value = { ...this.value, sessions }
      await this.persist(value)
      this.value = value
      return this.get(sessionId)
    })
  }

  remove(sessionId) {
    return this.enqueue(async () => {
      if (this.value.sessions[sessionId] === undefined && !this.isDeletionPending(sessionId)) return
      const sessions = { ...this.value.sessions }
      delete sessions[sessionId]
      const value = {
        ...this.value,
        sessions,
        pendingDeletions: this.value.pendingDeletions.filter(id => id !== sessionId),
      }
      await this.persist(value)
      this.value = value
    })
  }

  queueDeletion(sessionId) {
    return this.enqueue(async () => {
      if (this.isDeletionPending(sessionId)) return
      const value = {
        ...this.value,
        pendingDeletions: [...this.value.pendingDeletions, sessionId],
      }
      await this.persist(value)
      this.value = value
    })
  }

  async persist(value) {
    const temporary = `${this.path}.${process.pid}.${randomUUID()}.tmp`
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
    await rename(temporary, this.path)
  }

  enqueue(operation) {
    const result = this.tail.then(operation)
    this.tail = result.then(() => undefined, () => undefined)
    return result
  }
}

function titleOf(summary) {
  const title = summary.projections?.values?.title
  return typeof title === 'string' && title.trim() !== '' ? title : summary.sessionId
}

export function sessionRows(summaries, archivedIds, state) {
  const archived = new Set(archivedIds)
  return summaries.map(summary => {
    const metadata = state.get(summary.sessionId)
    return {
      sessionId: summary.sessionId,
      title: titleOf(summary),
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
      cwd: summary.cwd ?? null,
      running: summary.running,
      archived: archived.has(summary.sessionId),
      favorite: metadata.favorite,
      tags: [...metadata.tags],
      pendingDeletion: state.isDeletionPending(summary.sessionId),
    }
  })
}

/** Build one immutable reasoning-free title request without changing the logged source request. */
export function improveTitleOptions(options) {
  if (options.purpose !== 'session-title' || options.reasoningEffort === 'off') return undefined
  return Object.freeze({ ...options, reasoningEffort: 'off' })
}

/** Re-enter the LLM waterfall once with the rewritten title request, or delegate unchanged. */
export function streamImprovedTitle(ctx, options, next) {
  const improved = improveTitleOptions(options)
  return improved === undefined ? next() : ctx.llm.stream(improved)
}

function resolveStateDirectory(config) {
  const configured = config.stateDir?.trim()
  if (configured === undefined || configured === '') {
    return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'session-manager')
  }
  const expanded = configured === '~' || configured.startsWith('~/')
    ? join(homedir(), configured.slice(2))
    : configured
  if (!isAbsolute(expanded)) throw new Error('session-manager stateDir must be an absolute path or start with ~/')
  return resolve(expanded)
}

/**
 * Use the current alpha Workspace registry's own mutation chain for an inverse archive write.
 * This fails loudly after an incompatible DSH upgrade instead of editing workspace.json behind the live service.
 */
export async function setArchived(ctx, sessionId, archived) {
  const registry = ctx.workspaceRegistry
  const enqueue = registry.enqueueOperation
  const setState = registry.setState
  const requireState = registry.requireState
  if (typeof enqueue !== 'function' || typeof setState !== 'function' || typeof requireState !== 'function') {
    throw new Error('this DSH version does not expose the Workspace mutation hooks required by session-manager')
  }
  await enqueue.call(registry, async () => {
    const current = requireState.call(registry)
    const present = current.archivedSessionIds.includes(sessionId)
    if (present === archived) return
    const archivedSessionIds = archived
      ? [...current.archivedSessionIds, sessionId]
      : current.archivedSessionIds.filter(id => id !== sessionId)
    await setState.call(registry, { ...current, archivedSessionIds })
  })
}

async function listRows(ctx, state, signal) {
  const [response, headers] = await Promise.all([
    ctx.sessionController.list({}, signal),
    ctx.sessionPersistence.list(signal),
  ])
  const createdAt = new Map(headers.map(header => [header.id, header.createdAt]))
  return sessionRows(
    response.items.map(summary => ({ ...summary, createdAt: createdAt.get(summary.sessionId) ?? summary.updatedAt })),
    ctx.workspaceRegistry.archivedSessionIds,
    state,
  )
}

function workspaceMembership(ctx, sessionId) {
  return ctx.workspaceRegistry.list().flatMap(workspace => {
    const at = workspace.sessionIds.indexOf(sessionId)
    if (at === -1) return []
    return [{ workspace, before: workspace.sessionIds[at + 1] }]
  })
}

function assertJsonlLocation(location, sessionId) {
  if (location === undefined || location.kind !== 'jsonl') {
    throw new Error('permanent deletion requires the JSONL session persistence backend')
  }
  const directory = dirname(location.path)
  if (basename(directory) !== sessionId || !basename(location.path).startsWith('session.jsonl')) {
    throw new Error(`refusing unexpected session artifact path ${location.path}`)
  }
  return directory
}

async function deleteProjectionCache(ctx, sessionId) {
  const domain = ctx.storageDomain.get('session_projcache')
  if (domain !== undefined) await domain.table('sessions').delete(sessionId)
}

export class SessionManager {
  constructor(ctx, state, options = { autoLoadFullHistory: true }) {
    this.ctx = ctx
    this.state = state
    this.options = options
    this.tail = Promise.resolve()
  }

  dispatch(endpoint, payload, signal) {
    switch (endpoint) {
      case 'options': return Promise.resolve(ok({ autoLoadFullHistory: this.options.autoLoadFullHistory }))
      case 'list': return this.list(signal)
      case 'restore': return this.mutate(() => this.restore(payload))
      case 'favorite': return this.mutate(() => this.favorite(payload))
      case 'tags': return this.mutate(() => this.tags(payload))
      case 'delete': return this.mutate(() => this.delete(payload))
      default: return Promise.resolve(failure('not-found', `unknown session-manager endpoint ${endpoint}`))
    }
  }

  async list(signal) {
    return ok({ sessions: await listRows(this.ctx, this.state, signal) })
  }

  async restore(payload) {
    const sessionId = requireSessionId(requireRecord(payload).sessionId)
    if (this.state.isDeletionPending(sessionId)) {
      return failure('deletion-pending', `session ${sessionId} is queued for permanent deletion`, { sessionId })
    }
    if (!this.ctx.workspaceRegistry.archivedSessionIds.includes(sessionId)) {
      return failure('not-archived', `session ${sessionId} is not archived`, { sessionId })
    }
    await setArchived(this.ctx, sessionId, false)
    return ok({ sessionId, restored: true })
  }

  async favorite(payload) {
    const request = requireRecord(payload)
    const sessionId = requireSessionId(request.sessionId)
    if (typeof request.favorite !== 'boolean') throw new TypeError('favorite must be boolean')
    if (this.state.isDeletionPending(sessionId)) {
      return failure('deletion-pending', `session ${sessionId} is queued for permanent deletion`, { sessionId })
    }
    await this.requireKnown(sessionId)
    const metadata = await this.state.update(sessionId, current => ({ ...current, favorite: request.favorite }))
    return ok({ sessionId, ...metadata })
  }

  async tags(payload) {
    const request = requireRecord(payload)
    const sessionId = requireSessionId(request.sessionId)
    const tags = normalizeTags(request.tags)
    if (this.state.isDeletionPending(sessionId)) {
      return failure('deletion-pending', `session ${sessionId} is queued for permanent deletion`, { sessionId })
    }
    await this.requireKnown(sessionId)
    const metadata = await this.state.update(sessionId, current => ({ ...current, tags }))
    return ok({ sessionId, ...metadata })
  }

  async delete(payload) {
    const request = requireRecord(payload)
    const sessionId = requireSessionId(request.sessionId)
    if (request.confirmation !== sessionId) {
      return failure('confirmation-required', 'permanent deletion requires the exact session id', { sessionId })
    }
    if (!this.ctx.workspaceRegistry.archivedSessionIds.includes(sessionId)) {
      return failure('archive-required', 'archive the session before permanent deletion', { sessionId })
    }
    const agent = this.ctx.agents.get(sessionId)
    if (agent?.status === 'running') {
      return failure('session-running', 'a running session cannot be permanently deleted', { sessionId })
    }
    if (this.ctx.sessions.get(sessionId) !== undefined || agent !== undefined) {
      await this.state.queueDeletion(sessionId)
      return ok({ sessionId, deleted: false, pendingRestart: true, memoryPreserved: true })
    }

    return this.deleteColdSession(sessionId)
  }

  async deleteColdSession(sessionId) {
    const headers = await this.ctx.sessionPersistence.list()
    const header = headers.find(candidate => candidate.id === sessionId)
    if (header === undefined) return failure('session-not-found', `session ${sessionId} was not found`, { sessionId })
    const sourceDirectory = assertJsonlLocation(this.ctx.sessionPersistence.locate(header), sessionId)
    const quarantine = `${sourceDirectory}.deleting-${randomUUID()}`
    const memberships = workspaceMembership(this.ctx, sessionId)
    const metadata = this.state.get(sessionId)
    const pendingDeletion = this.state.isDeletionPending(sessionId)
    let moved = false
    let unarchived = false
    try {
      await rename(sourceDirectory, quarantine)
      moved = true
      for (const { workspace } of memberships) await workspace.detachSession(sessionId)
      await setArchived(this.ctx, sessionId, false)
      unarchived = true
      await deleteProjectionCache(this.ctx, sessionId)
      await this.state.remove(sessionId)
      await rm(quarantine, { recursive: true, force: true })
      moved = false
      try {
        this.ctx.emit('api-session/removed', sessionId)
      } catch (error) {
        this.ctx.logger.warn(`session-manager deleted ${sessionId}, but UI removal notification failed: ${errorMessage(error)}`)
      }
      return ok({ sessionId, deleted: true, memoryPreserved: true })
    } catch (error) {
      const rollbackErrors = []
      if (moved) {
        try { await rename(quarantine, sourceDirectory) } catch (rollbackError) { rollbackErrors.push(rollbackError) }
      }
      if (unarchived) {
        try { await setArchived(this.ctx, sessionId, true) } catch (rollbackError) { rollbackErrors.push(rollbackError) }
      }
      for (const { workspace, before } of memberships) {
        try {
          await workspace.attachSession(sessionId)
          if (before !== undefined) await workspace.insertSessionBefore(sessionId, before)
        } catch (rollbackError) { rollbackErrors.push(rollbackError) }
      }
      try { await this.state.update(sessionId, () => metadata) } catch (rollbackError) { rollbackErrors.push(rollbackError) }
      if (pendingDeletion) {
        try { await this.state.queueDeletion(sessionId) } catch (rollbackError) { rollbackErrors.push(rollbackError) }
      }
      if (rollbackErrors.length > 0) {
        throw new AggregateError([error, ...rollbackErrors], `session ${sessionId} deletion and rollback failed`)
      }
      throw error
    }
  }

  async finalizePendingDeletions() {
    for (const sessionId of this.state.pendingDeletionIds()) {
      const agent = this.ctx.agents.get(sessionId)
      if (this.ctx.sessions.get(sessionId) !== undefined || agent !== undefined) {
        this.ctx.logger.warn(`session-manager kept pending deletion for live session ${sessionId}`)
        continue
      }
      try {
        const result = await this.mutate(() => this.deleteColdSession(sessionId))
        if (!result.ok && result.error.code === 'session-not-found') await this.state.remove(sessionId)
      } catch (error) {
        this.ctx.logger.warn(`session-manager could not finalize pending deletion ${sessionId}: ${errorMessage(error)}`)
      }
    }
  }

  async requireKnown(sessionId) {
    const headers = await this.ctx.sessionPersistence.list()
    if (!headers.some(header => header.id === sessionId) && this.ctx.sessions.get(sessionId) === undefined) {
      throw new Error(`session ${sessionId} was not found`)
    }
  }

  mutate(operation) {
    const result = this.tail.then(operation)
    this.tail = result.then(() => undefined, () => undefined)
    return result
  }
}

export async function apply(ctx, config) {
  const state = new SessionManagerState(resolveStateDirectory(config))
  await state.load()
  const manager = new SessionManager(ctx, state, config)
  await manager.finalizePendingDeletions()

  if (config.improveNonDeepSeekTitles) {
    ctx.on('llm/stream', (options, next) => {
      return streamImprovedTitle(ctx, options, next)
    })
  }

  ctx.effect(() => ctx.connection.rpc.handle(CHANNEL, async (endpoint, payload, signal) => {
    try {
      return await manager.dispatch(endpoint, payload, signal)
    } catch (error) {
      ctx.logger.warn(`session-manager ${endpoint} failed: ${errorMessage(error)}`)
      return failure('internal', errorMessage(error))
    }
  }), 'session-manager: authenticated RPC channel')
}
