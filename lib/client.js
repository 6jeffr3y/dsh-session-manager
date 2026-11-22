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
    const PANEL_ID = 'session-manager'
    const compactOpeners = new Set()

    function openCompactSessionManager() {
      for (const open of compactOpeners) open()
    }

    const dictionaries = {
      zh: {
        open: '会话管理',
        title: '会话管理',
        subtitle: '归档、置顶、目标单位标签与安全删除',
        close: '关闭',
        refresh: '刷新',
        back: '返回会话',
        compact: '缩为窗口',
        expand: '放大会话管理',
        collapse: '还原会话管理',
        all: '全部',
        archived: '已归档',
        pinned: '置顶',
        graph: '关系图',
        search: '搜索标题、路径、目标单位标签或普通标签',
        noSessions: '当前视图没有会话',
        archive: '归档会话',
        restore: '取消归档',
        pin: '置顶会话',
        unpin: '取消置顶',
        tags: '目标单位标签',
        developer: '开发商',
        outcomeTypes: '普通标签',
        zoomOut: '缩小界面',
        zoomIn: '放大界面',
        graphZoomOut: '缩小视图',
        graphZoomIn: '放大视图',
        editTags: '编辑标签',
        tagsHint: '选择或输入目标单位标签',
        addTag: '添加',
        removeTag: '移除',
        graphEmpty: '当前筛选没有可关联的会话',
        sessionGraphNode: '会话',
        openSession: '打开会话',
        openArchivedSession: '恢复并打开会话',
        save: '保存',
        cancel: '取消',
        delete: '永久删除',
        deleteDisabled: '请先归档会话；正在运行的会话不能删除',
        deleteTitle: '确认永久删除',
        deleteBody: '只删除该会话的 Session 日志、投影缓存、目标单位标签和普通标签。MemOS、Agent 记忆及其他记忆数据不会被删除。此操作无法撤销。',
        deleteConfirm: '确认永久删除',
        deleting: '删除中…',
        loading: '正在读取会话…',
        running: '运行中',
        archivedBadge: '已归档',
        pendingDeletion: '等待重启删除',
        pendingDeletionHint: '该会话已确认删除；下次重启 DSH 时会在会话恢复前完成永久删除',
        error: '操作失败',
        memoryPreserved: '记忆数据保持不变',
        tagView: '目标单位标签',
      },
      en: {
        open: 'Session manager',
        title: 'Session manager',
        subtitle: 'Archive, pin, target unit tags and safely delete sessions',
        close: 'Close',
        refresh: 'Refresh',
        back: 'Back to conversation',
        compact: 'Compact view',
        expand: 'Expand session manager',
        collapse: 'Restore session manager',
        all: 'All',
        archived: 'Archived',
        pinned: 'Pinned',
        graph: 'Graph',
        search: 'Search titles, paths, target unit tags or tags',
        noSessions: 'No sessions in this view',
        archive: 'Archive session',
        restore: 'Unarchive session',
        pin: 'Pin session',
        unpin: 'Unpin session',
        tags: 'Target unit tags',
        developer: 'Developer',
        outcomeTypes: 'Tags',
        zoomOut: 'Zoom out',
        zoomIn: 'Zoom in',
        graphZoomOut: 'Zoom graph out',
        graphZoomIn: 'Zoom graph in',
        editTags: 'Edit tags',
        tagsHint: 'Select or enter target unit tags',
        addTag: 'Add',
        removeTag: 'Remove',
        graphEmpty: 'No related sessions match the current filters',
        sessionGraphNode: 'Session',
        openSession: 'Open session',
        openArchivedSession: 'Restore and open session',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete permanently',
        deleteDisabled: 'Archive the session first; running sessions cannot be deleted',
        deleteTitle: 'Confirm permanent deletion',
        deleteBody: 'Only this Session log, projection cache, target unit tags and tags are deleted. MemOS, Agent memory and other memory data are preserved. This cannot be undone.',
        deleteConfirm: 'Delete permanently',
        deleting: 'Deleting…',
        loading: 'Loading sessions…',
        running: 'Running',
        archivedBadge: 'Archived',
        pendingDeletion: 'Delete after restart',
        pendingDeletionHint: 'Deletion is confirmed and will finish before sessions resume on the next DSH restart',
        error: 'Operation failed',
        memoryPreserved: 'Memory data is unchanged',
        tagView: 'Target unit tags',
      },
    }

    const css = `
.dsm-trigger{width:100%;min-height:38px;border:0;border-radius:9px;background:transparent;color:var(--dsw-alias-label-secondary);display:flex;align-items:center;justify-content:center;gap:9px;padding:8px;cursor:pointer;font:inherit;font-size:13px}.dsm-trigger:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}.dsm-trigger.wide{justify-content:flex-start;padding-inline:12px}.dsm-icon{font-size:17px;line-height:1}.dsm-backdrop{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.48);display:flex;align-items:center;justify-content:center;padding:24px;pointer-events:auto}.dsm-modal{width:min(980px,calc(100vw - 32px));height:min(760px,calc(100vh - 32px));border:1px solid var(--dsw-alias-border-l2);border-radius:18px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 24px 80px rgba(0,0,0,.34);display:flex;flex-direction:column;overflow:hidden}.dsm-head{display:flex;align-items:flex-start;gap:16px;padding:20px 22px 14px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dsm-heading{flex:1;min-width:0}.dsm-heading h2{font-size:20px;line-height:1.3;margin:0}.dsm-heading p{font-size:12px;color:var(--dsw-alias-label-tertiary);margin:5px 0 0}.dsm-iconbtn,.dsm-button{border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer}.dsm-iconbtn{width:34px;height:34px;font-size:18px}.dsm-button{padding:7px 12px;font-size:12px}.dsm-button:hover,.dsm-iconbtn:hover{border-color:var(--dsw-alias-label-tertiary)}.dsm-button:disabled{opacity:.42;cursor:not-allowed}.dsm-button.primary{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-foreground);border-color:transparent}.dsm-button.danger{color:#ef5b5b}.dsm-button.danger.primary{background:#d93036;color:#fff}.dsm-toolbar{display:flex;align-items:center;gap:8px;padding:12px 20px;border-bottom:1px solid var(--dsw-alias-border-l2);flex-wrap:wrap}.dsm-tab{border:0;border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);padding:7px 12px;font:inherit;font-size:12px;cursor:pointer}.dsm-tab.active{background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-primary);font-weight:600}.dsm-search{flex:1;min-width:180px;height:34px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);padding:0 12px;font:inherit;font-size:12px}.dsm-body{display:grid;grid-template-columns:180px minmax(0,1fr);min-height:0;flex:1}.dsm-tagside{padding:14px;border-right:1px solid var(--dsw-alias-border-l2);overflow:auto}.dsm-side-title{font-size:11px;color:var(--dsw-alias-label-tertiary);margin:0 8px 8px;text-transform:uppercase}.dsm-tagfilter{width:100%;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);padding:7px 8px;text-align:left;font:inherit;font-size:12px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dsm-tagfilter.active,.dsm-tagfilter:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}.dsm-list{list-style:none;margin:0;padding:10px 14px 20px;overflow:auto}.dsm-row{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-2);padding:13px 14px;margin-bottom:9px}.dsm-rowhead{display:flex;align-items:flex-start;gap:10px}.dsm-star{border:0;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:20px;line-height:1;cursor:pointer;padding:0}.dsm-star.on{color:#f0a928}.dsm-main{min-width:0;flex:1}.dsm-title{display:block;width:100%;border:0;background:transparent;color:var(--dsw-alias-label-primary);padding:0;text-align:left;font:inherit;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}.dsm-title:hover{text-decoration:underline}.dsm-meta{font-size:11px;color:var(--dsw-alias-label-tertiary);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dsm-badges{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.dsm-badge{font-size:10px;border-radius:999px;padding:2px 7px;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary)}.dsm-badge.archive{color:#d69d30}.dsm-badge.running{color:#55ad72}.dsm-actions{display:flex;align-items:center;justify-content:flex-end;gap:7px;margin-top:10px;flex-wrap:wrap}.dsm-empty,.dsm-loading{display:flex;align-items:center;justify-content:center;min-height:220px;color:var(--dsw-alias-label-tertiary);font-size:13px}.dsm-error{margin:10px 20px 0;border:1px solid rgba(239,91,91,.45);border-radius:9px;background:rgba(239,91,91,.08);color:#ef7474;padding:9px 12px;font-size:12px}.dsm-editbox{margin-top:10px}.dsm-edit{display:flex;align-items:center;gap:7px}.dsm-edit input{flex:1;min-width:0;height:32px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);padding:0 9px;font:inherit;font-size:12px}.dsm-suggestions{display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin-top:7px}.dsm-suggestions-label{font-size:10px;color:var(--dsw-alias-label-tertiary);margin-right:2px}.dsm-suggestion{border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);padding:3px 8px;font:inherit;font-size:10px;cursor:pointer}.dsm-suggestion.selected{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}.dsm-confirm-layer{position:absolute;inset:0;background:rgba(0,0,0,.38);display:flex;align-items:center;justify-content:center;padding:20px}.dsm-confirm{width:min(470px,100%);border:1px solid var(--dsw-alias-border-l2);border-radius:15px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 18px 60px rgba(0,0,0,.4);padding:20px}.dsm-confirm h3{margin:0;font-size:17px}.dsm-confirm p{font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary);margin:10px 0}.dsm-confirm-code{display:block;border-radius:8px;background:var(--dsw-alias-bg-layer-3);padding:8px 10px;font:11px ui-monospace,monospace;overflow-wrap:anywhere}.dsm-confirm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.dsm-modal-wrap{position:relative;display:contents}@media(max-width:720px){.dsm-backdrop{padding:8px}.dsm-modal{width:100%;height:100%;border-radius:12px}.dsm-body{grid-template-columns:1fr}.dsm-tagside{display:none}.dsm-head{padding:15px}.dsm-toolbar{padding:10px}.dsm-list{padding:8px}}
.dsm-graph-wrap{position:relative;min-width:0;min-height:0;overflow:hidden;background:radial-gradient(circle at center,rgba(94,129,244,.09),transparent 62%)}.dsm-graph-zoom{position:absolute;z-index:2;top:10px;right:12px;margin:0}.dsm-graph-zoom .dsm-zoom-value{min-width:28px}.dsm-graph{display:block;width:100%;height:100%;min-height:420px;touch-action:none;cursor:grab;user-select:none}.dsm-graph.dragging{cursor:grabbing}.dsm-graph-link{stroke:var(--dsw-alias-border-l2);stroke-width:1.15;stroke-opacity:.82;transition:opacity .12s ease}.dsm-graph-link.dimmed{opacity:.12}.dsm-graph-node{cursor:pointer;outline:none;transition:opacity .12s ease}.dsm-graph-node.dimmed{opacity:.18}.dsm-graph-node.focused circle{stroke:var(--dsw-alias-label-primary);stroke-width:3}.dsm-graph-node circle{stroke:var(--dsw-alias-bg-layer-1);stroke-width:2;transition:r .12s ease,filter .12s ease}.dsm-graph-node:hover circle,.dsm-graph-node:focus circle{filter:brightness(1.25);stroke:var(--dsw-alias-label-secondary)}.dsm-graph-node.session circle{fill:var(--dsw-alias-brand-primary)}.dsm-graph-node.session.archived circle{fill:#b48638}.dsm-graph-node.session.running circle{fill:#43a666}.dsm-graph-node.unitTag circle{fill:#8b6ad9}.dsm-graph-node.tag circle{fill:#4fb3a6}.dsm-graph-label{fill:var(--dsw-alias-label-secondary);font:12px system-ui,sans-serif;paint-order:stroke;stroke:var(--dsw-alias-bg-layer-1);stroke-width:3px;stroke-linejoin:round}.dsm-graph-node.tag .dsm-graph-label,.dsm-graph-node.unitTag .dsm-graph-label{fill:var(--dsw-alias-label-primary);font-weight:600}.dsm-graph-empty{height:100%;min-height:420px}.dsm-graph-legend{position:absolute;z-index:2;right:12px;bottom:10px;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px;color:var(--dsw-alias-label-tertiary);font-size:10px}.dsm-legend-dot::before{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-brand-primary);margin-right:4px}.dsm-legend-dot.unitTag::before{background:#8b6ad9}.dsm-legend-dot.tag::before{background:#4fb3a6}.dsm-legend-dot.developer::before{background:#e08a3c}.dsm-graph-node.developer circle{fill:#e08a3c}.dsm-graph-node.developer .dsm-graph-label{fill:var(--dsw-alias-label-primary);font-weight:600}.dsm-badge.unitTag{color:#a68bf0;background:rgba(139,106,217,.16)}.dsm-badge.ordinaryTag{color:#67c1b5;background:rgba(79,179,166,.14)}.dsm-badge.developer{color:#e0a45a;background:rgba(224,138,60,.14)}.dsm-zoom{display:inline-flex;align-items:center;gap:1px;margin-inline:3px;padding:1px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-layer-1)}.dsm-zoom-button{min-width:24px;height:24px;border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;line-height:1;cursor:pointer}.dsm-zoom-button:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}.dsm-zoom-value{min-width:20px;text-align:center;color:var(--dsw-alias-label-tertiary);font-size:10px;font-variant-numeric:tabular-nums}.dsm-editor-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.dsm-picker{min-width:0}.dsm-picker-label{display:block;margin-bottom:5px;color:var(--dsw-alias-label-tertiary);font-size:10px}.dsm-chips{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:5px}.dsm-chip{display:inline-flex;align-items:center;gap:2px;max-width:100%;border-radius:999px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);font-size:10px;padding:2px 4px 2px 7px}.dsm-chip-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsm-chip button{border:0;background:transparent;color:inherit;padding:0 1px;font:inherit;line-height:1;cursor:pointer}.dsm-chip button:hover{color:var(--dsw-alias-label-primary)}.dsm-picker-row{display:flex;gap:4px}.dsm-picker input{flex:1;min-width:0;height:30px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);padding:0 8px;font:inherit;font-size:11px}.dsm-picker-add{width:30px;height:30px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);font:inherit;font-size:15px;line-height:1;cursor:pointer}.dsm-picker-add:hover:not(:disabled){color:var(--dsw-alias-label-primary)}.dsm-picker-add:disabled{opacity:.4;cursor:not-allowed}.dsm-editor-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:8px}.dsm-groups{min-height:0;overflow:auto;padding:8px 14px 20px}.dsm-workspace-group{margin-bottom:6px}.dsm-workspace-head{display:flex;align-items:center;gap:7px;width:100%;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);padding:6px 4px;text-align:left;font:inherit;font-size:11px;font-weight:600;cursor:pointer}.dsm-workspace-head:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}.dsm-workspace-arrow{color:var(--dsw-alias-label-tertiary);font-size:14px;line-height:1;transform:rotate(0);transition:transform .12s ease}.dsm-workspace-arrow.open{transform:rotate(90deg)}.dsm-workspace-title{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsm-workspace-count{color:var(--dsw-alias-label-tertiary);font-size:10px;font-weight:400}.dsm-workspace-list{padding:0;overflow:visible}.dsm-modal{position:relative}.dsm-row{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:'head actions' 'editor editor';align-items:start;gap:8px 12px}.dsm-rowhead{grid-area:head;min-width:0}.dsm-row>.dsm-actions{grid-area:actions;margin-top:0;align-self:start;justify-content:flex-end}.dsm-row>.dsm-editbox{grid-area:editor}.dsm-page{position:relative;display:flex;flex-direction:column;height:100%;min-height:0;padding:calc(var(--dsh-frame-top-clearance,0px) + 16px) clamp(20px,3vw,36px) 20px;box-sizing:border-box;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}.dsm-page-inner{display:flex;flex-direction:column;width:100%;max-width:none;height:100%;min-height:0;margin:0}.dsm-page-head{display:flex;flex:none;align-items:flex-start;gap:10px;padding:0 0 14px}.dsm-page-surface{position:relative;display:flex;flex:1;flex-direction:column;min-height:0;overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-layer-1)}.dsm-page-surface .dsm-body{border-radius:0}@media(max-width:720px){.dsm-editor-grid{grid-template-columns:1fr}.dsm-row{grid-template-columns:1fr;grid-template-areas:'head' 'actions' 'editor'}.dsm-row>.dsm-actions{justify-content:flex-start}}
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
      const center = { x: 600, y: 440 }
      const orderedSessions = sessions
        .filter(session => !session.archived && (session.unitTags.length > 0 || session.developer || (session.outcomeTypes ?? []).length > 0))
        .sort((left, right) => left.sessionId.localeCompare(right.sessionId))
      const relationValues = new Map()
      for (const session of orderedSessions) {
        for (const tag of session.unitTags) {
          const entry = relationValues.get(`unitTag:${tag}`) ?? { id: `unitTag:${tag}`, kind: 'unitTag', value: tag, tag, label: `# ${tag}` }
          entry.count = (entry.count ?? 0) + 1
          relationValues.set(entry.id, entry)
        }
        if (session.developer) {
          const id = `developer:${session.developer}`
          const entry = relationValues.get(id) ?? { id, kind: 'developer', value: session.developer, label: session.developer }
          entry.count = (entry.count ?? 0) + 1
          relationValues.set(id, entry)
        }
        for (const tag of session.outcomeTypes ?? []) {
          const id = `tag:${tag}`
          const entry = relationValues.get(id) ?? { id, kind: 'tag', value: tag, tag, label: tag }
          entry.count = (entry.count ?? 0) + 1
          relationValues.set(id, entry)
        }
      }
      const relations = [...relationValues.values()]
        .sort((left, right) => left.kind.localeCompare(right.kind) || left.value.localeCompare(right.value))
        .map(node => ({ ...node, label: `${node.label} · ${node.count}` }))
      const relationRingCount = relations.length > 26 ? 3 : relations.length > 12 ? 2 : 1
      const relationPerRing = Math.max(1, Math.ceil(relations.length / relationRingCount))
      const relationAngles = new Map()
      const relationNodes = relations.map((node, index) => {
        const ring = Math.floor(index / relationPerRing)
        const inRing = index % relationPerRing
        const angle = relationPerRing === 1
          ? -Math.PI / 2
          : (Math.PI * 2 * inRing / relationPerRing) - Math.PI / 2 + ring * 0.18
        const radius = 150 + ring * 120
        relationAngles.set(node.id, angle)
        return { ...node, x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius }
      })
      const links = []
      const sessionRingCount = orderedSessions.length > 24 ? 2 : 1
      const sessionPerRing = Math.max(1, Math.ceil(orderedSessions.length / sessionRingCount))
      const sessionNodes = orderedSessions.map((session, index) => {
        const relationIds = [
          ...session.unitTags.map(tag => `unitTag:${tag}`),
          ...(session.developer ? [`developer:${session.developer}`] : []),
          ...(session.outcomeTypes ?? []).map(tag => `tag:${tag}`),
        ]
        for (const target of relationIds) links.push({ source: `session:${session.sessionId}`, target })
        const vectors = relationIds.map(id => relationAngles.get(id))
        const x = vectors.reduce((sum, value) => sum + Math.cos(value), 0)
        const y = vectors.reduce((sum, value) => sum + Math.sin(value), 0)
        let angle = Math.abs(x) + Math.abs(y) < 0.001 ? (stableHash(session.sessionId) % 6283) / 1000 : Math.atan2(y, x)
        const hash = stableHash(session.sessionId)
        const ring = Math.floor(index / sessionPerRing)
        angle += ((hash % 101) - 50) / 260 + ring * 0.23
        const radius = 360 + ring * 70 + (hash % 3) * 12
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

    function unarchiveManagedSession(client, sessionId) {
      return client.uiWorkspace.unarchiveSession(sessionId)
    }

    function togglePinnedSession(client, session) {
      return session.pinned
        ? client.uiWorkspace.unpinSession(session.sessionId)
        : client.uiWorkspace.pinSession(session.sessionId)
    }

    const ZOOM_STORAGE_KEY = 'session-manager:content-font-size'
    const ZOOM_MIN = 10
    const ZOOM_MAX = 22
    const fontZoomListeners = new Set()

    function readStoredFontZoom() {
      try {
        const saved = Number.parseInt(localStorage.getItem(ZOOM_STORAGE_KEY) ?? '', 10)
        return Number.isFinite(saved) ? saved : undefined
      } catch {
        return undefined
      }
    }

    function readFontZoom() {
      const inline = Number.parseInt(document.body.style.getPropertyValue('--dsh-content-font-size'), 10)
      if (Number.isFinite(inline)) return inline
      const saved = readStoredFontZoom()
      if (saved !== undefined) return saved
      if (typeof getComputedStyle !== 'function') return undefined
      const computed = Number.parseInt(getComputedStyle(document.body).getPropertyValue('--dsh-content-font-size'), 10)
      return Number.isFinite(computed) ? computed : undefined
    }

    function applyFontZoom(px) {
      const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(px)))
      document.body.style.setProperty('--dsh-content-font-size', `${next}px`)
      try { localStorage.setItem(ZOOM_STORAGE_KEY, String(next)) } catch { /* storage can be unavailable */ }
      for (const listener of fontZoomListeners) listener(next)
      return next
    }

    async function openManagedSession(client, session) {
      if (session.archived) {
        await unarchiveManagedSession(client, session.sessionId)
        await waitForUnarchived(client, session.sessionId)
      }
      client.uiWorkspace.openSession(session.sessionId)
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

    function FontSizeControl({ t, adjustFontSize }) {
      const [size, setSize] = React.useState(() => readFontZoom() ?? 14)
      React.useEffect(() => {
        fontZoomListeners.add(setSize)
        setSize(readFontZoom() ?? 14)
        return () => fontZoomListeners.delete(setSize)
      }, [])
      const adjust = delta => {
        const next = adjustFontSize(delta)
        if (Number.isFinite(next)) setSize(next)
      }
      return h('div', { className: 'dsm-zoom' },
        h('button', {
          type: 'button',
          className: 'dsm-zoom-button',
          title: t('zoomOut'),
          'aria-label': t('zoomOut'),
          onClick: () => adjust(-1),
        }, 'A-'),
        h('span', { className: 'dsm-zoom-value', 'aria-live': 'polite' }, String(size)),
        h('button', {
          type: 'button',
          className: 'dsm-zoom-button',
          title: t('zoomIn'),
          'aria-label': t('zoomIn'),
          onClick: () => adjust(1),
        }, 'A+'))
    }

    function TagPicker({ id, label, values, options, placeholder, max, t, autoFocus = false, onChange }) {
      const [draft, setDraft] = React.useState('')
      const selected = values ?? []
      const add = () => {
        const value = draft.trim()
        if (value === '' || selected.includes(value) || selected.length >= max) {
          setDraft('')
          return
        }
        onChange([...selected, value])
        setDraft('')
      }
      return h('div', { className: 'dsm-picker' },
        h('label', { className: 'dsm-picker-label', htmlFor: id }, label),
        selected.length === 0 ? null : h('div', { className: 'dsm-chips' },
          ...selected.map(value => h('span', { key: value, className: 'dsm-chip' },
            h('span', { className: 'dsm-chip-label' }, value),
            h('button', {
              type: 'button',
              title: `${t('removeTag')} ${value}`,
              'aria-label': `${t('removeTag')} ${value}`,
              onClick: () => onChange(selected.filter(item => item !== value)),
            }, '×')))),
        h('div', { className: 'dsm-picker-row' },
          h('input', {
            id,
            list: `${id}-options`,
            value: draft,
            placeholder,
            autoFocus,
            autoComplete: 'off',
            onChange: event => setDraft(event.target.value),
            onKeyDown: event => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault()
                add()
              }
            },
          }),
          h('datalist', { id: `${id}-options` },
            ...options.filter(option => !selected.includes(option)).map(option => h('option', { key: option, value: option }))),
          h('button', {
            type: 'button',
            className: 'dsm-picker-add',
            title: t('addTag'),
            'aria-label': t('addTag'),
            disabled: draft.trim() === '' || selected.length >= max,
            onClick: add,
          }, '+')))
    }

    function SessionManagerContent({ client, t, variant, onClose, onExpand, onCompact }) {
      const isPage = variant === 'page'
      const [sessions, setSessions] = React.useState([])
      const [loading, setLoading] = React.useState(false)
      const [error, setError] = React.useState('')
      const [view, setView] = React.useState('all')
      const [tag, setTag] = React.useState('')
      const [relation, setRelation] = React.useState(null)
      const [query, setQuery] = React.useState('')
      const [editing, setEditing] = React.useState(null)
      const [tagDraft, setTagDraft] = React.useState('')
      const [developerDraft, setDeveloperDraft] = React.useState('')
      const [outcomeDraft, setOutcomeDraft] = React.useState('')
      const [confirming, setConfirming] = React.useState(null)
      const [pending, setPending] = React.useState(new Set())
      const [graphTransform, setGraphTransform] = React.useState({ x: 0, y: 0, scale: 1 })
      const [graphDrag, setGraphDrag] = React.useState(null)
      const [graphHover, setGraphHover] = React.useState(null)

      const refresh = React.useCallback(async () => {
        setLoading(true); setError('')
        try { setSessions((await rpc(client, 'list', {})).sessions) }
        catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
        finally { setLoading(false) }
      }, [client])

      React.useEffect(() => { void refresh() }, [refresh])
      React.useEffect(() => {
        if (isPage) return undefined
        const close = event => { if (event.key === 'Escape') { if (confirming) setConfirming(null); else onClose() } }
        document.addEventListener('keydown', close)
        return () => document.removeEventListener('keydown', close)
      }, [isPage, onClose, confirming])

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
          onClose()
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        } finally {
          setPending(current => { const next = new Set(current); next.delete(session.sessionId); return next })
        }
      }

      const allTags = [...new Set(sessions.flatMap(session => session.unitTags))].sort((a, b) => a.localeCompare(b))
      const allDevelopers = [...new Set(sessions.flatMap(session => session.developer).filter(Boolean))].sort((a, b) => a.localeCompare(b))
      const allOrdinaryTags = [...new Set(sessions.flatMap(session => session.outcomeTypes))].sort((a, b) => a.localeCompare(b))
      const needle = query.trim().toLocaleLowerCase()
      const visible = sessions.filter(session => {
        if (view === 'archived' && !session.archived) return false
        if (view === 'pinned' && !session.pinned) return false
        if (tag && !session.unitTags.includes(tag)) return false
        if (relation?.kind === 'unitTag' && !session.unitTags.includes(relation.value)) return false
        if (relation?.kind === 'tag' && !session.outcomeTypes.includes(relation.value)) return false
        if (relation?.kind === 'developer' && session.developer !== relation.value) return false
        if (!needle) return true
        return `${session.title}\n${session.cwd ?? ''}\n${session.developer ?? ''}\n${session.outcomeTypes.join('\n')}\n${session.unitTags.join('\n')}`.toLocaleLowerCase().includes(needle)
      })

      const tabs = [['all', t('all')], ['archived', t('archived')], ['pinned', t('pinned')], ['graph', t('graph')]]
      const renderSessionItem = session => {
        const busy = pending.has(session.sessionId)
        const canDelete = session.archived && !session.running && !session.pendingDeletion
        const badges = [
          session.archived ? h('span', { key: 'archived', className: 'dsm-badge archive' }, t('archivedBadge')) : null,
          session.running ? h('span', { key: 'running', className: 'dsm-badge running' }, t('running')) : null,
          session.pendingDeletion ? h('span', { key: 'pendingDeletion', className: 'dsm-badge archive', title: t('pendingDeletionHint') }, t('pendingDeletion')) : null,
          session.developer ? h('span', { key: 'developer', className: 'dsm-badge developer' }, session.developer) : null,
          ...session.outcomeTypes.map(value => h('span', { key: `outcome:${value}`, className: 'dsm-badge ordinaryTag' }, value)),
          ...session.unitTags.map(value => h('span', { key: value, className: 'dsm-badge unitTag' }, `# ${value}`)),
        ]
        const unitTags = parseTagDraft(tagDraft)
        const ordinaryTags = parseTagDraft(outcomeDraft)
        const tagEditor = editing === session.sessionId ? h('div', { className: 'dsm-editbox' },
          h('div', { className: 'dsm-editor-grid' },
            h(TagPicker, {
              id: `dsm-${session.sessionId}-unit-tags`,
              label: t('tags'),
              values: unitTags,
              options: allTags,
              placeholder: t('tagsHint'),
              max: 8,
              t,
              autoFocus: true,
              onChange: values => setTagDraft(values.join(', ')),
            }),
            h(TagPicker, {
              id: `dsm-${session.sessionId}-developer`,
              label: t('developer'),
              values: developerDraft === '' ? [] : [developerDraft],
              options: allDevelopers,
              placeholder: t('developer'),
              max: 1,
              t,
              onChange: values => setDeveloperDraft(values[0] ?? ''),
            }),
            h(TagPicker, {
              id: `dsm-${session.sessionId}-ordinary-tags`,
              label: t('outcomeTypes'),
              values: ordinaryTags,
              options: allOrdinaryTags,
              placeholder: t('outcomeTypes'),
              max: 8,
              t,
              onChange: values => setOutcomeDraft(values.join(', ')),
            })),
          h('div', { className: 'dsm-editor-actions' },
            h('button', { type: 'button', className: 'dsm-button', onClick: () => { setEditing(null); setTagDraft(''); setDeveloperDraft(''); setOutcomeDraft('') } }, t('cancel')),
            h('button', {
              type: 'button',
              className: 'dsm-button primary',
              disabled: busy,
              onClick: () => void run(session.sessionId, async () => {
                await rpc(client, 'metadata', {
                  sessionId: session.sessionId,
                  unitTags,
                  developer: developerDraft,
                  outcomeTypes: ordinaryTags,
                })
                setEditing(null); setTagDraft(''); setDeveloperDraft(''); setOutcomeDraft('')
              }),
            }, t('save')))) : null
        return h('li', { className: 'dsm-row', key: session.sessionId, 'data-session-id': session.sessionId },
          h('div', { className: 'dsm-rowhead' },
            h('button', { type: 'button', className: `dsm-star${session.pinned ? ' on' : ''}`, title: t(session.pinned ? 'unpin' : 'pin'), disabled: busy || session.archived, onClick: () => void run(session.sessionId, () => togglePinnedSession(client, session)) }, session.pinned ? '★' : '☆'),
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
            h('button', { type: 'button', className: 'dsm-button', disabled: busy || session.pendingDeletion, onClick: () => { setEditing(session.sessionId); setTagDraft(session.unitTags.join(', ')); setDeveloperDraft(session.developer ?? ''); setOutcomeDraft(session.outcomeTypes.join(', ')) } }, t('editTags')),
            session.archived
              ? h('button', { type: 'button', className: 'dsm-button primary', disabled: busy || session.pendingDeletion, onClick: () => void run(session.sessionId, () => unarchiveManagedSession(client, session.sessionId)) }, t('restore'))
              : h('button', { type: 'button', className: 'dsm-button', disabled: busy || session.running, title: session.running ? t('running') : t('archive'), onClick: () => void run(session.sessionId, () => archiveManagedSession(client, session.sessionId)) }, t('archive')),
            h('button', { type: 'button', className: 'dsm-button danger', disabled: busy || !canDelete, title: canDelete ? t('delete') : t('deleteDisabled'), onClick: () => setConfirming(session) }, t('delete'))))
      }
      const sessionItems = visible.map(renderSessionItem)
      const list = loading && sessions.length === 0
        ? h('div', { className: 'dsm-loading' }, t('loading'))
        : visible.length === 0
          ? h('div', { className: 'dsm-empty' }, t('noSessions'))
          : h('ul', { className: 'dsm-list' }, ...sessionItems)
      const graphData = buildSessionGraph(visible)
      const graphNodes = new Map(graphData.nodes.map(node => [node.id, node]))
      const setGraphScale = factor => {
        setGraphTransform(current => {
          const scale = Math.max(0.45, Math.min(2.8, current.scale * factor))
          const ratio = scale / current.scale
          return {
            x: 600 - (600 - current.x) * ratio,
            y: 440 - (440 - current.y) * ratio,
            scale,
          }
        })
      }
      const activeGraphIds = graphHover === null ? null : new Set([graphHover])
      if (graphHover !== null) {
        for (const link of graphData.links) {
          if (link.source === graphHover) activeGraphIds.add(link.target)
          if (link.target === graphHover) activeGraphIds.add(link.source)
        }
      }
      const showSessionLabels = graphTransform.scale >= 1.08
      const graphNodeElements = graphData.nodes.map(node => {
        const activate = () => {
          if (node.kind === 'session') void openSession(node.session)
          else if (node.kind === 'unitTag') setTag(current => current === node.tag ? '' : node.tag)
          else setRelation(current => current?.kind === node.kind && current.value === node.value ? null : { kind: node.kind, value: node.value })
        }
        const classNames = ['dsm-graph-node', node.kind]
        if (node.kind === 'session' && node.session.archived) classNames.push('archived')
        if (node.kind === 'session' && node.session.running) classNames.push('running')
        if (graphHover === node.id) classNames.push('focused')
        if (activeGraphIds !== null && !activeGraphIds.has(node.id)) classNames.push('dimmed')
        const radius = node.kind === 'session' ? 6 : 8 + Math.min(6, node.count)
        const label = node.kind === 'session' ? (node.shortLabel ?? node.label) : shortGraphLabel(node.label)
        const showLabel = node.kind !== 'session' || showSessionLabels || graphHover === node.id
        return h('g', {
          key: node.id,
          className: classNames.join(' '),
          transform: `translate(${node.x} ${node.y})`,
          role: 'button',
          tabIndex: 0,
          'aria-label': node.label,
          onPointerEnter: () => setGraphHover(node.id),
          onPointerLeave: () => setGraphHover(current => current === node.id ? null : current),
          onPointerDown: event => event.stopPropagation(),
          onClick: event => { event.stopPropagation(); activate() },
          onKeyDown: event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate() }
          },
        },
        h('circle', { r: radius }, h('title', null, node.label)),
        showLabel ? h('text', { className: 'dsm-graph-label', x: radius + 5, y: 4 }, label) : null)
      })
      const graph = graphData.nodes.length === 0
        ? h('div', { className: 'dsm-empty dsm-graph-empty' }, t('graphEmpty'))
        : h('div', { className: 'dsm-graph-wrap' },
          h('div', { className: 'dsm-zoom dsm-graph-zoom' },
            h('button', { type: 'button', className: 'dsm-zoom-button', title: t('graphZoomOut'), 'aria-label': t('graphZoomOut'), onClick: () => setGraphScale(1 / 1.2) }, '-'),
            h('span', { className: 'dsm-zoom-value' }, `${Math.round(graphTransform.scale * 100)}%`),
            h('button', { type: 'button', className: 'dsm-zoom-button', title: t('graphZoomIn'), 'aria-label': t('graphZoomIn'), onClick: () => setGraphScale(1.2) }, '+')),
          h('svg', {
            className: `dsm-graph${graphDrag === null ? '' : ' dragging'}`,
            viewBox: '0 0 1200 900',
            role: 'group',
            'aria-label': t('graph'),
            onWheel: event => {
              event.preventDefault()
              setGraphScale(event.deltaY < 0 ? 1.12 : 1 / 1.12)
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
              const dimmed = activeGraphIds !== null && link.source !== graphHover && link.target !== graphHover
              return h('line', { key: `${link.source}->${link.target}`, className: `dsm-graph-link${dimmed ? ' dimmed' : ''}`, x1: source.x, y1: source.y, x2: target.x, y2: target.y })
            }),
            ...graphNodeElements)),
          h('div', { className: 'dsm-graph-legend', 'aria-hidden': true },
            h('span', { className: 'dsm-legend-dot' }, t('sessionGraphNode')),
            h('span', { className: 'dsm-legend-dot unitTag' }, t('tags')),
            h('span', { className: 'dsm-legend-dot developer' }, t('developer')),
            h('span', { className: 'dsm-legend-dot tag' }, t('outcomeTypes'))))
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
      const heading = h('div', { className: 'dsm-heading' }, h('h2', null, t('title')), h('p', null, t('subtitle')))
      const header = isPage
        ? h('div', { className: 'dsm-page-head' },
          heading,
          h('button', { type: 'button', className: 'dsm-iconbtn', title: t('compact'), 'aria-label': t('compact'), onClick: onCompact }, '⤡'),
          h('button', { type: 'button', className: 'dsm-iconbtn', title: t('back'), 'aria-label': t('back'), onClick: onClose }, '←'),
          h('button', { type: 'button', className: 'dsm-button', disabled: loading, onClick: refresh }, t('refresh')))
        : h('div', { className: 'dsm-head' },
          heading,
          h('button', { type: 'button', className: 'dsm-button', disabled: loading, onClick: refresh }, t('refresh')),
          h('button', { type: 'button', className: 'dsm-iconbtn', title: t('expand'), 'aria-label': t('expand'), onClick: onExpand }, '⤢'),
          h('button', { type: 'button', className: 'dsm-iconbtn', 'aria-label': t('close'), onClick: onClose }, '×'))
      const toolbar = h('div', { className: 'dsm-toolbar' },
        ...tabs.map(([id, label]) => h('button', { key: id, type: 'button', className: `dsm-tab${view === id && (!tag || id === 'graph') ? ' active' : ''}`, onClick: () => { setView(id); setTag(''); setRelation(null) } }, label)),
        h('input', { className: 'dsm-search', value: query, placeholder: t('search'), onChange: event => setQuery(event.target.value) }))
      const body = h('div', { className: 'dsm-body' },
        h('aside', { className: 'dsm-tagside' }, h('p', { className: 'dsm-side-title' }, t('tagView')),
          ...allTags.map(value => h('button', { key: value, type: 'button', className: `dsm-tagfilter${tag === value ? ' active' : ''}`, onClick: () => { setTag(tag === value ? '' : value); setRelation(null); if (view !== 'graph') setView('all') } }, `# ${value}`))),
        view === 'graph' ? graph : list)
      if (isPage) {
        return h('div', { className: 'dsm-page' },
          h('div', { className: 'dsm-page-inner' },
            header,
            h('div', { className: 'dsm-page-surface' },
              toolbar,
              error ? h('div', { className: 'dsm-error' }, `${t('error')}: ${error}`) : null,
              body,
              confirmation)))
      }
      return h('div', {
        className: 'dsm-modal',
        role: 'dialog',
        'aria-modal': true,
        'aria-label': t('title'),
        'data-window-drag-exclude': '',
      },
        header,
        toolbar,
        error ? h('div', { className: 'dsm-error' }, `${t('error')}: ${error}`) : null,
        body,
        confirmation)
    }

    function SessionManagerFooterAction({ wide, client, t }) {
      const [open, setOpen] = React.useState(false)
      const close = () => setOpen(false)
      React.useEffect(() => {
        const openModal = () => setOpen(true)
        compactOpeners.add(openModal)
        return () => compactOpeners.delete(openModal)
      }, [])
      return h(React.Fragment, null,
        h('button', {
          type: 'button',
          className: `dsm-trigger${wide ? ' wide' : ''}`,
          title: t('open'),
          'aria-label': t('open'),
          onClick: () => client.layout.selectPanel(PANEL_ID),
        }, h('span', { className: 'dsm-icon', 'aria-hidden': true }, '☰'), wide ? h('span', null, t('open')) : null),
        open ? ReactDOM.createPortal(
          h('div', {
            className: 'dsm-backdrop',
            role: 'presentation',
            onMouseDown: event => { if (event.target === event.currentTarget) close() },
          }, h(SessionManagerContent, {
            client,
            t,
            variant: 'modal',
            onClose: close,
            onExpand: () => { close(); client.layout.selectPanel(PANEL_ID) },
          })),
          document.body) : null)
    }

    function SessionManagerPage({ client, t }) {
      return h(SessionManagerContent, {
        client,
        t,
        variant: 'page',
        onCompact: () => { openCompactSessionManager(); client.layout.selectPanel(null) },
        onClose: () => client.layout.selectPanel(null),
      })
    }

    const inject = ['slots', 'locale', 'connection', 'sessions', 'workspaces', 'uiWorkspace', 'theme', 'layout']
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, dictionaries), 'session-manager: dictionaries')
      ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
        name: 'conversation.session.header.utilities',
        id: 'session-manager-zoom',
        order: 30,
        locale: NS,
        inject: () => ({
          adjustFontSize: delta => {
            const current = readFontZoom() ?? ctx.theme.getTheme().fontSizes.text
            return applyFontZoom(current + delta)
          },
        }),
      }, FontSizeControl))
      const savedZoom = readStoredFontZoom()
      if (savedZoom !== undefined) applyFontZoom(savedZoom)
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
      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: PANEL_ID,
        locale: NS,
        inject: () => ({ client: ctx }),
      }, SessionManagerPage))
      ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: PANEL_ID,
        locale: NS,
        inject: () => ({ client: ctx }),
      }, SessionManagerFooterAction))
    }

    exports.inject = inject
    exports.apply = apply
    exports.parseTagDraft = parseTagDraft
    exports.toggleTagDraft = toggleTagDraft
    exports.buildSessionGraph = buildSessionGraph
    exports.createHistoryDrainController = createHistoryDrainController
    exports.installFullHistoryLoader = installFullHistoryLoader
    exports.archiveManagedSession = archiveManagedSession
    exports.unarchiveManagedSession = unarchiveManagedSession
    exports.togglePinnedSession = togglePinnedSession
    exports.openManagedSession = openManagedSession
    return module.exports
  },
})
