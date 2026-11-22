/** DSH 会话管理 Host 插件。 */
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import z from '@deepseek-ai/schemastery'
import { registerSessionTools } from './tools.js'

export const name = 'session-manager'
export const inject = [
  'agents',
  'connection',
  'fs',
  'sessionController',
  'sessionPersistence',
  'sessions',
  'storageDomain',
  'tools',
  'workspaceRegistry',
  'webServer',
]

export const Config = z.object({
  stateDir: z.string().default(''),
  autoLoadFullHistory: z.boolean().default(true),
  reportRoots: z.array(z.string()).default(['reports', 'analysis', 'notes']).volatile(),
  reportMaxFiles: z.number().step(1).min(1).default(5).volatile(),
  reportMaxCharsPerFile: z.number().step(1).min(200).default(4000).volatile(),
  reportMaxTotalChars: z.number().step(1).min(500).default(12000).volatile(),
  reportMaxDepth: z.number().step(1).min(1).default(3).volatile(),
})

const CHANNEL = '/session-manager'
const STATE_VERSION = 3
const MAX_TAGS = 8
const MAX_TAG_LENGTH = 32
const MAX_LABEL_LENGTH = 160
const MAX_OUTCOME_TYPES = 12
const MAX_OUTCOME_LENGTH = 48
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

function normalizeLabel(value, field) {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string') throw new TypeError(`${field} must be a string`)
  const label = value.trim()
  if ([...label].length > MAX_LABEL_LENGTH) {
    throw new TypeError(`${field} must contain at most ${MAX_LABEL_LENGTH} characters`)
  }
  return label
}

function normalizeOutcomeTypes(value) {
  if (!Array.isArray(value) || value.length > MAX_OUTCOME_TYPES) {
    throw new TypeError(`outcomeTypes must be an array with at most ${MAX_OUTCOME_TYPES} entries`)
  }
  const normalized = []
  for (const raw of value) {
    if (typeof raw !== 'string') throw new TypeError('every outcome type must be a string')
    const outcome = raw.trim()
    if (outcome.length === 0 || [...outcome].length > MAX_OUTCOME_LENGTH) {
      throw new TypeError(`every outcome type must contain 1-${MAX_OUTCOME_LENGTH} characters`)
    }
    if (!normalized.includes(outcome)) normalized.push(outcome)
  }
  return normalized
}

function emptyMetadata() {
  return { favorite: false, unitTags: [], developer: '', outcomeTypes: [] }
}

function normalizeMetadata(value) {
  const entry = requireRecord(value)
  return {
    favorite: entry.favorite === true,
    unitTags: normalizeTags(entry.unitTags ?? []),
    developer: normalizeLabel(entry.developer, 'developer'),
    outcomeTypes: normalizeOutcomeTypes(entry.outcomeTypes ?? []),
  }
}

function metadataIsEmpty(metadata) {
  return !metadata.favorite && metadata.unitTags.length === 0
    && metadata.developer === '' && metadata.outcomeTypes.length === 0
}

function emptyState() {
  return { version: STATE_VERSION, sessions: {}, pendingDeletions: [] }
}

export function parseState(value) {
  const state = requireRecord(value)
  if (state.version !== 1 && state.version !== 2 && state.version !== STATE_VERSION) {
    throw new Error(`unsupported state version ${String(state.version)}`)
  }
  const rawSessions = requireRecord(state.sessions)
  const sessions = {}
  for (const [id, raw] of Object.entries(rawSessions)) {
    requireSessionId(id)
    const entry = requireRecord(raw)
    if ((state.version === 1 || state.version === 2) && typeof entry.favorite !== 'boolean') {
      throw new TypeError(`session ${id} favorite must be boolean`)
    }
    const legacyUnitTags = [
      ...(Array.isArray(entry.unitTags) ? entry.unitTags : []),
      ...(Array.isArray(entry.tags) ? entry.tags : []),
      ...(typeof entry.unit === 'string' && entry.unit.trim() !== '' ? [entry.unit] : []),
    ]
    sessions[id] = normalizeMetadata({
      favorite: entry.favorite,
      unitTags: legacyUnitTags,
      developer: entry.developer,
      outcomeTypes: entry.outcomeTypes,
    })
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
      const raw = JSON.parse(await readFile(this.path, 'utf8'))
      this.value = parseState(raw)
      if (raw.version !== STATE_VERSION) await this.persist(this.value)
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
      await this.persist(this.value)
    }
  }

  get(sessionId) {
    return this.value.sessions[sessionId] ?? emptyMetadata()
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
      const next = normalizeMetadata(transform(this.get(sessionId)))
      if (metadataIsEmpty(next)) delete sessions[sessionId]
      else sessions[sessionId] = next
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

export function sessionRows(summaries, archivedIds, pinnedIds, state) {
  const archived = new Set(archivedIds)
  const pinned = new Set(pinnedIds)
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
      pinned: pinned.has(summary.sessionId),
      unitTags: [...(metadata.unitTags ?? [])],
      developer: metadata.developer ?? '',
      outcomeTypes: [...(metadata.outcomeTypes ?? [])],
      pendingDeletion: state.isDeletionPending(summary.sessionId),
    }
  })
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
  if (archived && typeof registry.archiveSession === 'function') {
    await registry.archiveSession(sessionId)
    return
  }
  if (!archived && typeof registry.unarchiveSession === 'function') {
    await registry.unarchiveSession(sessionId)
    return
  }
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
  const [response, snapshots] = await Promise.all([
    ctx.sessionController.list({}, signal),
    ctx.sessionPersistence.list({ signal }),
  ])
  const createdAt = new Map(snapshots.map(({ header }) => [header.id, header.createdAt]))
  return sessionRows(
    response.items.map(summary => ({ ...summary, createdAt: createdAt.get(summary.sessionId) ?? summary.updatedAt })),
    ctx.workspaceRegistry.archivedSessionIds,
    ctx.workspaceRegistry.pinnedSessionIds,
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

function relationReasons(left, right) {
  const reasons = []
  if (left.developer !== '' && left.developer === right.developer) reasons.push(`developer:${left.developer}`)
  for (const tag of left.unitTags) {
    if (right.unitTags.includes(tag)) reasons.push(`unitTag:${tag}`)
  }
  return reasons
}

const REPORT_SKIP_DIRS = new Set(['.git', 'node_modules', 'evidence', 'assets', 'dist', 'build', 'coverage', 'kb'])

async function collectReportFiles(ctx, cwd, config, signal) {
  const fs = ctx.fs
  const maxFiles = config.reportMaxFiles ?? 5
  const maxCharsPerFile = config.reportMaxCharsPerFile ?? 4000
  const maxTotalChars = config.reportMaxTotalChars ?? 12000
  const maxDepth = config.reportMaxDepth ?? 3
  const maxBytes = Math.max(1024, maxCharsPerFile * 4)
  const files = []
  const skipped = []
  let totalChars = 0

  const append = async (path, relativePath, target) => {
    if (files.length >= maxFiles || totalChars >= maxTotalChars) return
    const info = await fs.stat(target, signal)
    if (info === undefined || info.type !== 'file') return
    if (info.size !== undefined && info.size > maxBytes) {
      skipped.push({ path: relativePath, reason: 'too-large' })
      return
    }
    let content
    try {
      content = await fs.readText(target, signal)
    } catch (error) {
      skipped.push({ path: relativePath, reason: errorMessage(error) })
      return
    }
    const remaining = maxTotalChars - totalChars
    if (remaining <= 0) return
    const excerpt = content.slice(0, Math.min(maxCharsPerFile, remaining))
    if (excerpt.length === 0) return
    files.push({
      path: relativePath,
      size: info.size ?? content.length,
      excerpt,
      truncated: content.length > excerpt.length,
    })
    totalChars += excerpt.length
  }

  const walk = async (path, relativePath, depth) => {
    if (files.length >= maxFiles || totalChars >= maxTotalChars) return
    const info = await fs.lstat(path, { cwd }, signal)
    if (info === undefined || info.type !== 'directory') return
    const target = await fs.resolve(path, { cwd, signal })
    const entries = await fs.listDir(target, signal)
    for (const entry of entries) {
      if (files.length >= maxFiles || totalChars >= maxTotalChars) return
      const childPath = join(path, entry.name)
      const childRelative = join(relativePath, entry.name)
      if (entry.type === 'directory') {
        if (depth >= maxDepth || entry.name.startsWith('.') || REPORT_SKIP_DIRS.has(entry.name)) continue
        await walk(childPath, childRelative, depth + 1)
      } else if (entry.type === 'file' && /\.md$/iu.test(entry.name)) {
        await append(childPath, childRelative, entry.target)
      }
    }
  }

  const roots = Array.isArray(config.reportRoots) && config.reportRoots.length > 0
    ? config.reportRoots
    : ['reports', 'analysis', 'notes']
  for (const root of roots) await walk(join(cwd, root), root, 0)

  if (files.length < maxFiles) {
    const cwdTarget = await fs.resolve(cwd, { cwd, signal })
    const entries = await fs.listDir(cwdTarget, signal)
    for (const entry of entries) {
      if (files.length >= maxFiles || totalChars >= maxTotalChars) break
      if (entry.type === 'file' && /\.md$/iu.test(entry.name)) await append(join(cwd, entry.name), entry.name, entry.target)
    }
  }

  return { cwd, files, skipped, truncated: skipped.length > 0 || files.some(file => file.truncated) }
}

function assertJsonlLocation(path, sessionId) {
  const directory = dirname(path)
  if (basename(directory) !== sessionId || !/^session(?:\.v[1-9]\d*)?\.jsonl(?:\.zstd)?$/.test(basename(path))) {
    throw new Error(`refusing unexpected session artifact path ${path}`)
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
      case 'tags': return this.mutate(() => this.tags(payload))
      case 'metadata': return this.mutate(() => this.metadata(payload))
      case 'delete': return this.mutate(() => this.delete(payload))
      default: return Promise.resolve(failure('not-found', `unknown session-manager endpoint ${endpoint}`))
    }
  }

  async list(signal) {
    return ok({ sessions: await listRows(this.ctx, this.state, signal) })
  }

  async tags(payload) {
    const request = requireRecord(payload)
    const sessionId = requireSessionId(request.sessionId)
    const unitTags = normalizeTags(request.tags)
    if (this.state.isDeletionPending(sessionId)) {
      return failure('deletion-pending', `session ${sessionId} is queued for permanent deletion`, { sessionId })
    }
    await this.requireKnown(sessionId)
    const metadata = await this.state.update(sessionId, current => ({ ...current, unitTags }))
    return ok({ sessionId, ...metadata })
  }

  async metadata(payload) {
    const request = requireRecord(payload)
    const sessionId = requireSessionId(request.sessionId)
    if (this.state.isDeletionPending(sessionId)) {
      return failure('deletion-pending', `session ${sessionId} is queued for permanent deletion`, { sessionId })
    }
    await this.requireKnown(sessionId)
    const metadata = await this.state.update(sessionId, current => ({
      ...current,
      ...(request.unitTags === undefined ? {} : { unitTags: request.unitTags }),
      ...(request.developer === undefined ? {} : { developer: request.developer }),
      ...(request.outcomeTypes === undefined ? {} : { outcomeTypes: request.outcomeTypes }),
    }))
    return ok({ sessionId, ...metadata })
  }

  async getMetadata(sessionId) {
    await this.requireKnown(sessionId)
    return this.state.get(sessionId)
  }

  async related(sourceSessionId, filters = {}, signal) {
    const rows = await listRows(this.ctx, this.state, signal)
    const source = rows.find(row => row.sessionId === sourceSessionId)
    if (source === undefined) throw new Error(`session ${sourceSessionId} was not found`)
    const unitTag = typeof filters.unitTag === 'string' ? filters.unitTag.trim() : ''
    const developer = typeof filters.developer === 'string' ? filters.developer.trim() : ''
    const outcomeType = typeof filters.outcomeType === 'string' ? filters.outcomeType.trim() : ''
    const limit = Math.max(1, Math.min(50, Number.isInteger(filters.limit) ? filters.limit : 20))
    return rows
      .filter(row => row.sessionId !== source.sessionId)
      .map(row => {
        const reasons = relationReasons(source, row)
        if (unitTag !== '' && row.unitTags.includes(unitTag) && !reasons.includes(`unitTag:${unitTag}`)) reasons.push(`unitTag:${unitTag}`)
        return { row, reasons }
      })
      .filter(({ row, reasons }) => {
        if (unitTag !== '' && !row.unitTags.includes(unitTag)) return false
        if (developer !== '' && row.developer !== developer) return false
        if (outcomeType !== '' && !row.outcomeTypes.includes(outcomeType)) return false
        return reasons.length > 0
      })
      .slice(0, limit)
      .map(({ row, reasons }) => ({ ...row, relationReasons: reasons }))
  }

  async readReports(sourceSessionId, targetSessionId, options = {}, signal) {
    if (sourceSessionId === targetSessionId) throw new Error('session_reports requires another session')
    const rows = await listRows(this.ctx, this.state, signal)
    const source = rows.find(row => row.sessionId === sourceSessionId)
    const target = rows.find(row => row.sessionId === targetSessionId)
    if (source === undefined || target === undefined) throw new Error(`session ${targetSessionId} was not found`)
    if (relationReasons(source, target).length === 0) {
      throw new Error(`session ${targetSessionId} is not related to ${sourceSessionId}; use session_related first`)
    }
    if (target.cwd === null || target.cwd === '') throw new Error(`session ${targetSessionId} has no working directory`)
    const config = {
      ...this.options,
      ...(options.max_files === undefined ? {} : { reportMaxFiles: options.max_files }),
      ...(options.max_chars_per_file === undefined ? {} : { reportMaxCharsPerFile: options.max_chars_per_file }),
      ...(options.max_total_chars === undefined ? {} : { reportMaxTotalChars: options.max_total_chars }),
    }
    const report = await collectReportFiles(this.ctx, target.cwd, config, signal)
    return { sessionId: targetSessionId, title: target.title, ...report }
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
    const persistence = this.ctx.sessionPersistence
    const snapshot = await persistence.stat(sessionId)
    if (snapshot === undefined) return failure('session-not-found', `session ${sessionId} was not found`, { sessionId })
    const storedPath = snapshot.location?.kind === 'jsonl' ? snapshot.location.path : undefined
    if (storedPath === undefined && typeof persistence.resolveCurrentLog !== 'function') {
      throw new Error('permanent deletion requires the JSONL session persistence backend')
    }
    // resolveCurrentLog() reports only the current generation, so it returns
    // undefined for a migration-required cold Session. The snapshot still names
    // the selected historical artifact, and deletion removes its whole directory.
    const path = storedPath ?? await persistence.resolveCurrentLog(sessionId)
    if (path === undefined) {
      return failure('session-not-found', `session ${sessionId} has no materialized JSONL artifact`, { sessionId })
    }
    const sourceDirectory = assertJsonlLocation(path, sessionId)
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
    if (await this.ctx.sessionPersistence.stat(sessionId) === undefined && this.ctx.sessions.get(sessionId) === undefined) {
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
  registerSessionTools(ctx, manager)

  ctx.inject(['connection', 'webServer'], (connectionCtx) => {
    connectionCtx.effect(() => connectionCtx.connection.rpc.handle(CHANNEL, async (endpoint, payload, signal) => {
      try {
        return await manager.dispatch(endpoint, payload, signal)
      } catch (error) {
        ctx.logger.warn(`session-manager ${endpoint} failed: ${errorMessage(error)}`)
        return failure('internal', errorMessage(error))
      }
    }), 'session-manager: authenticated RPC channel')
  })
}
