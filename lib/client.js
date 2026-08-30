window.__ModuleLoader__.load({
  id: 'dsh-plugin-session-manager',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    const React = require('react')
    const ReactDOM = require('react-dom')
    const h = React.createElement
    const NS = 'session-manager'
    const CHANNEL = '/session-manager'

    const dictionaries = {
      zh: {
        open: '会话管理',
        title: '会话管理',
        subtitle: '归档、恢复、收藏、标签与安全删除',
        close: '关闭',
        refresh: '刷新',
        all: '全部',
        archived: '已归档',
        favorites: '收藏',
        graph: '关系图',
        search: '搜索标题、路径或标签',
        noSessions: '当前视图没有会话',
        archive: '归档会话',
        restore: '恢复会话',
        favorite: '收藏',
        unfavorite: '取消收藏',
        tags: '标签',
        editTags: '编辑标签',
        tagsHint: '用逗号分隔，最多 8 个标签',
        existingTags: '已有标签',
        multiTagHint: '可同时选择已有标签，也可用逗号一次新增多个标签',
        graphHint: '仅显示未归档会话，并按完全相同的标签关联：标签是根节点，拥有该标签的会话连接到它。滚轮缩放，拖动画布，点击会话可直接打开。',
        graphEmpty: '当前筛选没有未归档且带标签的会话关系',
        graphReset: '重置视图',
        sessionGraphNode: '会话',
        openSession: '打开会话',
        openArchivedSession: '恢复并打开会话',
        save: '保存',
        cancel: '取消',
        delete: '永久删除',
        deleteDisabled: '请先归档会话；正在运行的会话不能删除',
        deleteTitle: '确认永久删除',
        deleteBody: '只删除该会话的 Session 日志、投影缓存和标签。MemOS、Agent 记忆及其他记忆数据不会被删除。此操作无法撤销。',
        deleteConfirm: '确认永久删除',
        deleting: '删除中…',
        loading: '正在读取会话…',
        running: '运行中',
        archivedBadge: '已归档',
        pendingDeletion: '等待重启删除',
        pendingDeletionHint: '该会话已确认删除；下次重启 DSH 时会在会话恢复前完成永久删除',
        error: '操作失败',
        memoryPreserved: '记忆数据保持不变',
        tagView: '标签',
      },
      en: {
        open: 'Session manager',
        title: 'Session manager',
        subtitle: 'Archive, restore, favorite, tag and safely delete sessions',
        close: 'Close',
        refresh: 'Refresh',
        all: 'All',
        archived: 'Archived',
        favorites: 'Favorites',
        graph: 'Graph',
        search: 'Search titles, paths or tags',
        noSessions: 'No sessions in this view',
        archive: 'Archive session',
        restore: 'Restore session',
        favorite: 'Favorite',
        unfavorite: 'Remove favorite',
        tags: 'Tags',
        editTags: 'Edit tags',
        tagsHint: 'Comma-separated, up to 8 tags',
        existingTags: 'Existing tags',
        multiTagHint: 'Select existing tags or add several at once with commas',
        graphHint: 'Only active sessions are shown. Exact tags create links: each tag is a root connected to sessions that contain it. Scroll to zoom, drag to pan, and select a session to open it.',
        graphEmpty: 'No active tagged session relationships match the current filters',
        graphReset: 'Reset view',
        sessionGraphNode: 'Session',
        openSession: 'Open session',
        openArchivedSession: 'Restore and open session',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete permanently',
        deleteDisabled: 'Archive the session first; running sessions cannot be deleted',
        deleteTitle: 'Confirm permanent deletion',
        deleteBody: 'Only this Session log, projection cache and labels are deleted. MemOS, Agent memory and other memory data are preserved. This cannot be undone.',
        deleteConfirm: 'Delete permanently',
        deleting: 'Deleting…',
        loading: 'Loading sessions…',
        running: 'Running',
        archivedBadge: 'Archived',
        pendingDeletion: 'Delete after restart',
        pendingDeletionHint: 'Deletion is confirmed and will finish before sessions resume on the next DSH restart',
        error: 'Operation failed',
        memoryPreserved: 'Memory data is unchanged',
        tagView: 'Tag',
      },
    }

    const css = `
.dsm-trigger{width:100%;min-height:38px;border:0;border-radius:9px;background:transparent;color:var(--dsw-alias-label-secondary);display:flex;align-items:center;justify-content:center;gap:9px;padding:8px;cursor:pointer;font:inherit;font-size:13px}.dsm-trigger:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}.dsm-trigger.wide{justify-content:flex-start;padding-inline:12px}.dsm-icon{font-size:17px;line-height:1}.dsm-backdrop{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.48);display:flex;align-items:center;justify-content:center;padding:24px;pointer-events:auto}.dsm-modal{width:min(980px,calc(100vw - 32px));height:min(760px,calc(100vh - 32px));border:1px solid var(--dsw-alias-border-l2);border-radius:18px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 24px 80px rgba(0,0,0,.34);display:flex;flex-direction:column;overflow:hidden}.dsm-head{display:flex;align-items:flex-start;gap:16px;padding:20px 22px 14px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dsm-heading{flex:1;min-width:0}.dsm-heading h2{font-size:20px;line-height:1.3;margin:0}.dsm-heading p{font-size:12px;color:var(--dsw-alias-label-tertiary);margin:5px 0 0}.dsm-iconbtn,.dsm-button{border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer}.dsm-iconbtn{width:34px;height:34px;font-size:18px}.dsm-button{padding:7px 12px;font-size:12px}.dsm-button:hover,.dsm-iconbtn:hover{border-color:var(--dsw-alias-label-tertiary)}.dsm-button:disabled{opacity:.42;cursor:not-allowed}.dsm-button.primary{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-foreground);border-color:transparent}.dsm-button.danger{color:#ef5b5b}.dsm-button.danger.primary{background:#d93036;color:#fff}.dsm-toolbar{display:flex;align-items:center;gap:8px;padding:12px 20px;border-bottom:1px solid var(--dsw-alias-border-l2);flex-wrap:wrap}.dsm-tab{border:0;border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);padding:7px 12px;font:inherit;font-size:12px;cursor:pointer}.dsm-tab.active{background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-primary);font-weight:600}.dsm-search{flex:1;min-width:180px;height:34px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);padding:0 12px;font:inherit;font-size:12px}.dsm-body{display:grid;grid-template-columns:180px minmax(0,1fr);min-height:0;flex:1}.dsm-tagside{padding:14px;border-right:1px solid var(--dsw-alias-border-l2);overflow:auto}.dsm-side-title{font-size:11px;color:var(--dsw-alias-label-tertiary);margin:0 8px 8px;text-transform:uppercase}.dsm-tagfilter{width:100%;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);padding:7px 8px;text-align:left;font:inherit;font-size:12px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dsm-tagfilter.active,.dsm-tagfilter:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}.dsm-list{list-style:none;margin:0;padding:10px 14px 20px;overflow:auto}.dsm-row{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-2);padding:13px 14px;margin-bottom:9px}.dsm-rowhead{display:flex;align-items:flex-start;gap:10px}.dsm-star{border:0;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:20px;line-height:1;cursor:pointer;padding:0}.dsm-star.on{color:#f0a928}.dsm-main{min-width:0;flex:1}.dsm-title{display:block;width:100%;border:0;background:transparent;color:var(--dsw-alias-label-primary);padding:0;text-align:left;font:inherit;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}.dsm-title:hover{text-decoration:underline}.dsm-meta{font-size:11px;color:var(--dsw-alias-label-tertiary);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dsm-badges{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.dsm-badge{font-size:10px;border-radius:999px;padding:2px 7px;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary)}.dsm-badge.archive{color:#d69d30}.dsm-badge.running{color:#55ad72}.dsm-actions{display:flex;align-items:center;justify-content:flex-end;gap:7px;margin-top:10px;flex-wrap:wrap}.dsm-empty,.dsm-loading{display:flex;align-items:center;justify-content:center;min-height:220px;color:var(--dsw-alias-label-tertiary);font-size:13px}.dsm-error{margin:10px 20px 0;border:1px solid rgba(239,91,91,.45);border-radius:9px;background:rgba(239,91,91,.08);color:#ef7474;padding:9px 12px;font-size:12px}.dsm-editbox{margin-top:10px}.dsm-edit{display:flex;align-items:center;gap:7px}.dsm-edit input{flex:1;min-width:0;height:32px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);padding:0 9px;font:inherit;font-size:12px}.dsm-suggestions{display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin-top:7px}.dsm-suggestions-label{font-size:10px;color:var(--dsw-alias-label-tertiary);margin-right:2px}.dsm-suggestion{border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);padding:3px 8px;font:inherit;font-size:10px;cursor:pointer}.dsm-suggestion.selected{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}.dsm-confirm-layer{position:absolute;inset:0;background:rgba(0,0,0,.38);display:flex;align-items:center;justify-content:center;padding:20px}.dsm-confirm{width:min(470px,100%);border:1px solid var(--dsw-alias-border-l2);border-radius:15px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 18px 60px rgba(0,0,0,.4);padding:20px}.dsm-confirm h3{margin:0;font-size:17px}.dsm-confirm p{font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary);margin:10px 0}.dsm-confirm-code{display:block;border-radius:8px;background:var(--dsw-alias-bg-layer-3);padding:8px 10px;font:11px ui-monospace,monospace;overflow-wrap:anywhere}.dsm-confirm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.dsm-modal-wrap{position:relative;display:contents}@media(max-width:720px){.dsm-backdrop{padding:8px}.dsm-modal{width:100%;height:100%;border-radius:12px}.dsm-body{grid-template-columns:1fr}.dsm-tagside{display:none}.dsm-head{padding:15px}.dsm-toolbar{padding:10px}.dsm-list{padding:8px}}
.dsm-editor-hint{margin:6px 2px 0;color:var(--dsw-alias-label-tertiary);font-size:10px}.dsm-graph-wrap{position:relative;min-width:0;min-height:0;overflow:hidden;background:radial-gradient(circle at center,rgba(94,129,244,.09),transparent 62%)}.dsm-graph-help{position:absolute;z-index:2;top:12px;left:14px;max-width:560px;margin:0;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:1.5;pointer-events:none}.dsm-graph-reset{position:absolute;z-index:2;top:10px;right:12px}.dsm-graph{display:block;width:100%;height:100%;min-height:420px;touch-action:none;cursor:grab;user-select:none}.dsm-graph.dragging{cursor:grabbing}.dsm-graph-link{stroke:var(--dsw-alias-border-l2);stroke-width:1.15;stroke-opacity:.82}.dsm-graph-node{cursor:pointer;outline:none}.dsm-graph-node circle{stroke:var(--dsw-alias-bg-layer-1);stroke-width:2;transition:r .12s ease,filter .12s ease}.dsm-graph-node:hover circle,.dsm-graph-node:focus circle{filter:brightness(1.25);stroke:var(--dsw-alias-label-secondary)}.dsm-graph-node.session circle{fill:var(--dsw-alias-brand-primary)}.dsm-graph-node.session.archived circle{fill:#b48638}.dsm-graph-node.session.running circle{fill:#43a666}.dsm-graph-node.tag circle{fill:#8b6ad9}.dsm-graph-label{fill:var(--dsw-alias-label-secondary);font:11px system-ui,sans-serif;paint-order:stroke;stroke:var(--dsw-alias-bg-layer-1);stroke-width:3px;stroke-linejoin:round}.dsm-graph-node.tag .dsm-graph-label{fill:var(--dsw-alias-label-primary);font-weight:600}.dsm-graph-empty{height:100%;min-height:420px}.dsm-graph-legend{position:absolute;z-index:2;right:12px;bottom:10px;display:flex;gap:10px;color:var(--dsw-alias-label-tertiary);font-size:10px}.dsm-legend-dot::before{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-brand-primary);margin-right:4px}.dsm-legend-dot.tag::before{background:#8b6ad9}
`
    if (!document.querySelector('style[data-plugin-css="dsh-plugin-session-manager"]')) {
      const style = document.createElement('style')
      style.dataset.pluginCss = 'dsh-plugin-session-manager'
      style.textContent = css
      document.head.appendChild(style)
    }

    function rpc(ctx, endpoint, payload) {
      return ctx.connection.rpc.call(CHANNEL, endpoint, payload).then((result) => {
        if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
        return result.value
      })
    }

    function formatTime(value) {
      try { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
      catch { return String(value) }
    }

    function parseTagDraft(value) {
      return [...new Set(value.split(/[,，]/u).map(tag => tag.trim()).filter(Boolean))]
    }

    function toggleTagDraft(value, tag) {
      const tags = parseTagDraft(value)
      const index = tags.indexOf(tag)
      if (index !== -1) tags.splice(index, 1)
      else if (tags.length < 8) tags.push(tag)
      return tags.join(', ')
    }

    function stableHash(value) {
      let hash = 2166136261
      for (const character of value) {
        hash ^= character.codePointAt(0)
        hash = Math.imul(hash, 16777619)
      }
      return hash >>> 0
    }

    function shortGraphLabel(value) {
      const characters = [...value]
      return characters.length <= 24 ? value : `${characters.slice(0, 23).join('')}…`
    }

    function buildSessionGraph(sessions) {
      const center = { x: 450, y: 280 }
      const orderedSessions = sessions
        .filter(session => !session.archived && session.tags.length > 0)
        .sort((left, right) => left.sessionId.localeCompare(right.sessionId))
      const tags = [...new Set(orderedSessions.flatMap(session => session.tags))].sort((left, right) => left.localeCompare(right))
      const relations = tags.map(tag => {
        const count = orderedSessions.filter(session => session.tags.includes(tag)).length
        return { id: `tag:${tag}`, kind: 'tag', label: `# ${tag} · ${count}`, tag, count }
      })
      const relationAngles = new Map()
      const relationNodes = relations.map((node, index) => {
        const angle = relations.length === 1 ? -Math.PI / 2 : (Math.PI * 2 * index / relations.length) - Math.PI / 2
        relationAngles.set(node.id, angle)
        return { ...node, x: center.x + Math.cos(angle) * 125, y: center.y + Math.sin(angle) * 125 }
      })
      const links = []
      const sessionNodes = orderedSessions.map((session, index) => {
        const relationIds = session.tags.map(tag => `tag:${tag}`)
        for (const target of relationIds) links.push({ source: `session:${session.sessionId}`, target })
        const vectors = relationIds.map(id => relationAngles.get(id))
        const x = vectors.reduce((sum, value) => sum + Math.cos(value), 0)
        const y = vectors.reduce((sum, value) => sum + Math.sin(value), 0)
        let angle = Math.abs(x) + Math.abs(y) < 0.001 ? (stableHash(session.sessionId) % 6283) / 1000 : Math.atan2(y, x)
        const hash = stableHash(session.sessionId)
        angle += ((hash % 101) - 50) / 260
        const radius = 225 + (hash % 4) * 22
        return {
          id: `session:${session.sessionId}`,
          kind: 'session',
          label: session.title,
          shortLabel: shortGraphLabel(session.title),
          session,
          x: center.x + Math.cos(angle) * radius,
          y: center.y + Math.sin(angle) * radius,
        }
      })
      return { nodes: [...relationNodes, ...sessionNodes], links }
    }

    function waitForUnarchived(client, sessionId) {
      const archived = () => client.workspaces.list.getSnapshot().archivedSessionIds.includes(sessionId)
      if (!archived()) return Promise.resolve()
      return new Promise((resolve, reject) => {
        let settled = false
        let dispose = () => {}
        const finish = (error) => {
          if (settled) return
          settled = true
          clearTimeout(timeout)
          dispose()
          if (error === undefined) resolve()
          else reject(error)
        }
        const check = () => { if (!archived()) finish() }
        const timeout = setTimeout(() => finish(new Error(`workspace archive state did not update for ${sessionId}`)), 3000)
        dispose = client.workspaces.list.subscribe(check)
        check()
      })
    }

    function archiveManagedSession(client, sessionId) {
      return client.uiWorkspace.archiveSession(sessionId)
    }

    async function openManagedSession(client, session) {
      if (session.archived) {
        await rpc(client, 'restore', { sessionId: session.sessionId })
        await waitForUnarchived(client, session.sessionId)
      }
      client.sessions.open(session.sessionId)
    }

    function createHistoryDrainController(binding) {
      let disposed = false
      let running = false
      let wake = false
      let stalledRevision = null

      const pump = () => {
        if (disposed) return
        if (running) { wake = true; return }
        running = true
        void (async () => {
          while (!disposed) {
            const state = binding.session.getSnapshot()
            const window = binding.eventSource.getSnapshot()
            if (stalledRevision !== null && stalledRevision !== window.revision) stalledRevision = null
            if (state.openState !== 'open' || state.loadingOlder || !state.hasMore) return
            if (stalledRevision === window.revision) return
            const beforeRevision = window.revision
            const beforeLength = window.entries.length
            await binding.session.loadOlder()
            if (disposed) return
            const after = binding.eventSource.getSnapshot()
            if (!after.hasMore) return
            if (after.revision <= beforeRevision || after.entries.length <= beforeLength) {
              stalledRevision = after.revision
              console.warn(`[session-manager] full-history loading stalled for ${binding.sessionId}`)
              return
            }
            await new Promise(resolve => setTimeout(resolve, 0))
          }
        })().catch(error => {
          console.warn(`[session-manager] full-history loading failed for ${binding.sessionId}: ${error instanceof Error ? error.message : String(error)}`)
        }).finally(() => {
          running = false
          if (wake && !disposed) { wake = false; pump() }
        })
      }

      const unsubscribe = binding.session.subscribe(pump)
      pump()
      return () => {
        disposed = true
        unsubscribe()
      }
    }

    function installFullHistoryLoader(client) {
      let selectedId = null
      let disposeDrain = () => {}
      const attach = () => {
        const current = client.sessions.list.getSnapshot().current ?? null
        if (current === selectedId) return
        selectedId = current
        disposeDrain()
        disposeDrain = () => {}
        if (current === null) return
        const binding = client.sessions.binding(current)
        if (binding !== undefined) disposeDrain = createHistoryDrainController(binding)
      }
      const unsubscribe = client.sessions.list.subscribe(attach)
      attach()
      return () => {
        unsubscribe()
        disposeDrain()
      }
    }

    function SessionManagerPanel({ wide, client, t }) {
      const [open, setOpen] = React.useState(false)
      const [sessions, setSessions] = React.useState([])
      const [loading, setLoading] = React.useState(false)
      const [error, setError] = React.useState('')
      const [view, setView] = React.useState('all')
      const [tag, setTag] = React.useState('')
      const [query, setQuery] = React.useState('')
      const [editing, setEditing] = React.useState(null)
      const [tagDraft, setTagDraft] = React.useState('')
      const [confirming, setConfirming] = React.useState(null)
      const [pending, setPending] = React.useState(new Set())
      const [graphTransform, setGraphTransform] = React.useState({ x: 0, y: 0, scale: 1 })
      const [graphDrag, setGraphDrag] = React.useState(null)

      const refresh = React.useCallback(async () => {
        setLoading(true); setError('')
        try { setSessions((await rpc(client, 'list', {})).sessions) }
        catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
        finally { setLoading(false) }
      }, [client])

      React.useEffect(() => { if (open) void refresh() }, [open, refresh])
      React.useEffect(() => {
        const close = event => { if (event.key === 'Escape') { if (confirming) setConfirming(null); else setOpen(false) } }
        if (open) document.addEventListener('keydown', close)
        return () => document.removeEventListener('keydown', close)
      }, [open, confirming])

      const run = async (sessionId, action) => {
        if (pending.has(sessionId)) return
        setPending(current => new Set(current).add(sessionId)); setError('')
        try { await action(); await refresh() }
        catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
        finally { setPending(current => { const next = new Set(current); next.delete(sessionId); return next }) }
      }

      const openSession = async session => {
        if (pending.has(session.sessionId)) return
        setPending(current => new Set(current).add(session.sessionId)); setError('')
        try {
          await openManagedSession(client, session)
          setOpen(false)
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        } finally {
          setPending(current => { const next = new Set(current); next.delete(session.sessionId); return next })
        }
      }

      const allTags = [...new Set(sessions.flatMap(session => session.tags))].sort((a, b) => a.localeCompare(b))
      const needle = query.trim().toLocaleLowerCase()
      const visible = sessions.filter(session => {
        if (view === 'archived' && !session.archived) return false
        if (view === 'favorites' && !session.favorite) return false
        if (tag && !session.tags.includes(tag)) return false
        if (!needle) return true
        return `${session.title}\n${session.cwd ?? ''}\n${session.tags.join('\n')}`.toLocaleLowerCase().includes(needle)
      })

      const tabs = [['all', t('all')], ['archived', t('archived')], ['favorites', t('favorites')], ['graph', t('graph')]]
      const sessionItems = visible.map(session => {
        const busy = pending.has(session.sessionId)
        const canDelete = session.archived && !session.running && !session.pendingDeletion
        const badges = [
          session.archived ? h('span', { key: 'archived', className: 'dsm-badge archive' }, t('archivedBadge')) : null,
          session.running ? h('span', { key: 'running', className: 'dsm-badge running' }, t('running')) : null,
          session.pendingDeletion ? h('span', { key: 'pendingDeletion', className: 'dsm-badge archive', title: t('pendingDeletionHint') }, t('pendingDeletion')) : null,
          ...session.tags.map(value => h('span', { key: value, className: 'dsm-badge' }, `# ${value}`)),
        ]
        const selectedTags = new Set(parseTagDraft(tagDraft))
        const tagEditor = editing === session.sessionId ? h('div', { className: 'dsm-editbox' },
          h('div', { className: 'dsm-edit' },
            h('input', { value: tagDraft, placeholder: t('tagsHint'), autoFocus: true, onChange: event => setTagDraft(event.target.value) }),
            h('button', { type: 'button', className: 'dsm-button', onClick: () => { setEditing(null); setTagDraft('') } }, t('cancel')),
            h('button', { type: 'button', className: 'dsm-button primary', disabled: busy, onClick: () => void run(session.sessionId, async () => {
              await rpc(client, 'tags', { sessionId: session.sessionId, tags: parseTagDraft(tagDraft) })
              setEditing(null); setTagDraft('')
            }) }, t('save'))),
          h('p', { className: 'dsm-editor-hint' }, t('multiTagHint')),
          allTags.length === 0 ? null : h('div', { className: 'dsm-suggestions' },
            h('span', { className: 'dsm-suggestions-label' }, t('existingTags')),
            ...allTags.map(value => h('button', {
              key: value,
              type: 'button',
              className: `dsm-suggestion${selectedTags.has(value) ? ' selected' : ''}`,
              'aria-pressed': selectedTags.has(value),
              onClick: () => setTagDraft(current => toggleTagDraft(current, value)),
            }, `# ${value}`)))) : null
        return h('li', { className: 'dsm-row', key: session.sessionId, 'data-session-id': session.sessionId },
          h('div', { className: 'dsm-rowhead' },
            h('button', { type: 'button', className: `dsm-star${session.favorite ? ' on' : ''}`, title: t(session.favorite ? 'unfavorite' : 'favorite'), disabled: busy, onClick: () => void run(session.sessionId, () => rpc(client, 'favorite', { sessionId: session.sessionId, favorite: !session.favorite })) }, session.favorite ? '★' : '☆'),
            h('div', { className: 'dsm-main' },
              h('button', {
                type: 'button',
                className: 'dsm-title',
                title: t(session.archived ? 'openArchivedSession' : 'openSession'),
                disabled: busy,
                onClick: () => void openSession(session),
              }, session.title),
              h('div', { className: 'dsm-meta', title: session.cwd ?? session.sessionId }, `${formatTime(session.updatedAt)} · ${session.cwd ?? session.sessionId}`),
              h('div', { className: 'dsm-badges' }, ...badges))),
          tagEditor,
          h('div', { className: 'dsm-actions' },
            h('button', { type: 'button', className: 'dsm-button', disabled: busy || session.pendingDeletion, onClick: () => { setEditing(session.sessionId); setTagDraft(session.tags.join(', ')) } }, t('editTags')),
            session.archived
              ? h('button', { type: 'button', className: 'dsm-button primary', disabled: busy || session.pendingDeletion, onClick: () => void run(session.sessionId, () => rpc(client, 'restore', { sessionId: session.sessionId })) }, t('restore'))
              : h('button', { type: 'button', className: 'dsm-button', disabled: busy, onClick: () => void run(session.sessionId, () => archiveManagedSession(client, session.sessionId)) }, t('archive')),
            h('button', { type: 'button', className: 'dsm-button danger', disabled: busy || !canDelete, title: canDelete ? t('delete') : t('deleteDisabled'), onClick: () => setConfirming(session) }, t('delete'))))
      })
      const list = loading && sessions.length === 0
        ? h('div', { className: 'dsm-loading' }, t('loading'))
        : visible.length === 0
          ? h('div', { className: 'dsm-empty' }, t('noSessions'))
          : h('ul', { className: 'dsm-list' }, ...sessionItems)
      const graphData = buildSessionGraph(visible)
      const graphNodes = new Map(graphData.nodes.map(node => [node.id, node]))
      const graphNodeElements = graphData.nodes.map(node => {
        const activate = () => {
          if (node.kind === 'session') void openSession(node.session)
          else setTag(current => current === node.tag ? '' : node.tag)
        }
        const classNames = ['dsm-graph-node', node.kind]
        if (node.kind === 'session' && node.session.archived) classNames.push('archived')
        if (node.kind === 'session' && node.session.running) classNames.push('running')
        const radius = node.kind === 'session' ? 6 : 8 + Math.min(6, node.count)
        const label = node.shortLabel ?? node.label
        return h('g', {
          key: node.id,
          className: classNames.join(' '),
          transform: `translate(${node.x} ${node.y})`,
          role: 'button',
          tabIndex: 0,
          'aria-label': node.label,
          onPointerDown: event => event.stopPropagation(),
          onClick: event => { event.stopPropagation(); activate() },
          onKeyDown: event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate() }
          },
        },
        h('circle', { r: radius }, h('title', null, node.label)),
        h('text', { className: 'dsm-graph-label', x: radius + 5, y: 4 }, label))
      })
      const graph = graphData.nodes.length === 0
        ? h('div', { className: 'dsm-empty dsm-graph-empty' }, t('graphEmpty'))
        : h('div', { className: 'dsm-graph-wrap' },
          h('p', { className: 'dsm-graph-help' }, t('graphHint')),
          h('button', { type: 'button', className: 'dsm-button dsm-graph-reset', onClick: () => setGraphTransform({ x: 0, y: 0, scale: 1 }) }, t('graphReset')),
          h('svg', {
            className: `dsm-graph${graphDrag === null ? '' : ' dragging'}`,
            viewBox: '0 0 900 560',
            role: 'group',
            'aria-label': t('graph'),
            onWheel: event => {
              event.preventDefault()
              const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12
              setGraphTransform(current => ({ ...current, scale: Math.max(0.45, Math.min(2.8, current.scale * factor)) }))
            },
            onPointerDown: event => {
              if (event.button !== 0) return
              event.currentTarget.setPointerCapture?.(event.pointerId)
              setGraphDrag({ clientX: event.clientX, clientY: event.clientY, x: graphTransform.x, y: graphTransform.y })
            },
            onPointerMove: event => {
              if (graphDrag === null) return
              setGraphTransform(current => ({ ...current, x: graphDrag.x + event.clientX - graphDrag.clientX, y: graphDrag.y + event.clientY - graphDrag.clientY }))
            },
            onPointerUp: event => { event.currentTarget.releasePointerCapture?.(event.pointerId); setGraphDrag(null) },
            onPointerCancel: () => setGraphDrag(null),
          }, h('g', { transform: `translate(${graphTransform.x} ${graphTransform.y}) scale(${graphTransform.scale})` },
            ...graphData.links.map(link => {
              const source = graphNodes.get(link.source)
              const target = graphNodes.get(link.target)
              return h('line', { key: `${link.source}->${link.target}`, className: 'dsm-graph-link', x1: source.x, y1: source.y, x2: target.x, y2: target.y })
            }),
            ...graphNodeElements)),
          h('div', { className: 'dsm-graph-legend', 'aria-hidden': true },
            h('span', { className: 'dsm-legend-dot' }, t('sessionGraphNode')),
            h('span', { className: 'dsm-legend-dot tag' }, t('tags'))))
      const confirmation = confirming ? h('div', { className: 'dsm-confirm-layer', role: 'presentation' },
        h('div', { className: 'dsm-confirm', role: 'alertdialog', 'aria-modal': true },
          h('h3', null, t('deleteTitle')),
          h('p', null, t('deleteBody')),
          h('code', { className: 'dsm-confirm-code' }, confirming.sessionId),
          h('p', null, t('memoryPreserved')),
          h('div', { className: 'dsm-confirm-actions' },
            h('button', { type: 'button', className: 'dsm-button', onClick: () => setConfirming(null) }, t('cancel')),
            h('button', { type: 'button', className: 'dsm-button danger primary', disabled: pending.has(confirming.sessionId), onClick: () => void run(confirming.sessionId, async () => {
              await rpc(client, 'delete', { sessionId: confirming.sessionId, confirmation: confirming.sessionId })
              setConfirming(null)
            }) }, pending.has(confirming.sessionId) ? t('deleting') : t('deleteConfirm'))))) : null
      const dialog = h('div', { className: 'dsm-modal', role: 'dialog', 'aria-modal': true, 'aria-label': t('title') },
        h('div', { className: 'dsm-head' },
          h('div', { className: 'dsm-heading' }, h('h2', null, t('title')), h('p', null, t('subtitle'))),
          h('button', { type: 'button', className: 'dsm-button', disabled: loading, onClick: refresh }, t('refresh')),
          h('button', { type: 'button', className: 'dsm-iconbtn', 'aria-label': t('close'), onClick: () => setOpen(false) }, '×')),
        h('div', { className: 'dsm-toolbar' },
          ...tabs.map(([id, label]) => h('button', { key: id, type: 'button', className: `dsm-tab${view === id && (!tag || id === 'graph') ? ' active' : ''}`, onClick: () => { setView(id); setTag('') } }, label)),
          h('input', { className: 'dsm-search', value: query, placeholder: t('search'), onChange: event => setQuery(event.target.value) })),
        error ? h('div', { className: 'dsm-error' }, `${t('error')}: ${error}`) : null,
        h('div', { className: 'dsm-body' },
          h('aside', { className: 'dsm-tagside' }, h('p', { className: 'dsm-side-title' }, t('tagView')),
            ...allTags.map(value => h('button', { key: value, type: 'button', className: `dsm-tagfilter${tag === value ? ' active' : ''}`, onClick: () => { setTag(tag === value ? '' : value); if (view !== 'graph') setView('all') } }, `# ${value}`))),
          view === 'graph' ? graph : list),
        confirmation)
      const modal = open ? h('div', { className: 'dsm-backdrop', role: 'presentation', onMouseDown: event => { if (event.target === event.currentTarget) setOpen(false) } }, dialog) : null

      return h(React.Fragment, null,
        h('button', { type: 'button', className: `dsm-trigger${wide ? ' wide' : ''}`, title: t('open'), 'aria-label': t('open'), onClick: () => setOpen(true) }, h('span', { className: 'dsm-icon', 'aria-hidden': true }, '☰'), wide ? h('span', null, t('open')) : null),
        modal ? ReactDOM.createPortal(modal, document.body) : null)
    }

    const inject = ['slots', 'locale', 'connection', 'sessions', 'workspaces', 'uiWorkspace']
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, dictionaries), 'session-manager: dictionaries')
      ctx.effect(() => {
        let disposed = false
        let disposeLoader = () => {}
        void rpc(ctx, 'options', {}).then(options => {
          if (!disposed && options.autoLoadFullHistory) disposeLoader = installFullHistoryLoader(ctx)
        }).catch(error => {
          console.warn(`[session-manager] could not read client options: ${error instanceof Error ? error.message : String(error)}`)
        })
        return () => {
          disposed = true
          disposeLoader()
        }
      }, 'session-manager: complete selected-session history')
      ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'session-manager',
        locale: NS,
        inject: () => ({ client: ctx }),
      }, SessionManagerPanel))
    }

    exports.inject = inject
    exports.apply = apply
    exports.parseTagDraft = parseTagDraft
    exports.toggleTagDraft = toggleTagDraft
    exports.buildSessionGraph = buildSessionGraph
    exports.createHistoryDrainController = createHistoryDrainController
    exports.installFullHistoryLoader = installFullHistoryLoader
    exports.archiveManagedSession = archiveManagedSession
    exports.openManagedSession = openManagedSession
    return module.exports
  },
})
