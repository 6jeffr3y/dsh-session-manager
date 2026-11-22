import { defineTool } from '@deepseek-ai/dsh-tools'

function renderJson(_args, value) {
  return [{ type: 'text', text: JSON.stringify(value, null, 2) }]
}

function currentSessionId(exec) {
  const id = exec.agent?.session.header.id
  if (id === undefined) throw new Error('this tool requires a calling agent session')
  return String(id)
}

function applyListChanges(current, add, remove) {
  const removed = new Set(Array.isArray(remove) ? remove : [])
  const next = current.filter(value => !removed.has(value))
  for (const value of Array.isArray(add) ? add : []) {
    if (!next.includes(value)) next.push(value)
  }
  return next
}

/**
 * Register the session graph's model-facing tools.
 * @param ctx - host context carrying tools, the session manager, and filesystem.
 * @param manager - session-manager state and session index.
 */
export function registerSessionTools(ctx, manager) {
  const register = tool => ctx.effect(() => ctx.tools.register(tool), `session-manager:${tool.name}`)

  register(defineTool({
    name: 'session_tag',
    description: 'Add or update target metadata on a Session: target unit tags, developer, and ordinary tags. This changes session metadata only; it does not read or modify the session log.',
    parameters: {
      session_id: { type: 'string', description: 'Target session id. Defaults to the current session.' },
      add_unit_tags: { type: 'array', items: { type: 'string' }, description: 'Target unit tags to add.' },
      remove_unit_tags: { type: 'array', items: { type: 'string' }, description: 'Target unit tags to remove.' },
      developer: { type: 'string', description: 'Developer or supplier name. An empty string clears it.' },
      add_outcome_types: { type: 'array', items: { type: 'string' }, description: 'Ordinary tags to add, such as RCE, SQLI, ATO, or retest.' },
      remove_outcome_types: { type: 'array', items: { type: 'string' }, description: 'Ordinary tags to remove.' },
    },
    output: { schema: { type: 'json' }, render: renderJson },
    async execute(args, exec) {
      const sessionId = args.session_id ?? currentSessionId(exec)
      const current = await manager.getMetadata(sessionId)
      const result = await manager.metadata({
        sessionId,
        ...(args.developer === undefined ? {} : { developer: args.developer }),
        unitTags: applyListChanges(current.unitTags, args.add_unit_tags, args.remove_unit_tags),
        outcomeTypes: applyListChanges(current.outcomeTypes, args.add_outcome_types, args.remove_outcome_types),
      })
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    },
  }))

  register(defineTool({
    name: 'session_related',
    description: 'List Sessions related to a Session by shared target unit tags or developer. Returns summaries only, never session logs; use session_reports for bounded Markdown clues.',
    parameters: {
      session_id: { type: 'string', description: 'Source session id. Defaults to the current session.' },
      unit_tag: { type: 'string', description: 'Require this exact target unit tag.' },
      developer: { type: 'string', description: 'Require this developer.' },
      outcome_type: { type: 'string', description: 'Require this ordinary tag, such as RCE or SQLI.' },
      limit: { type: 'number', description: 'Maximum related sessions to return. Defaults to 20; capped at 50.' },
    },
    output: { schema: { type: 'json' }, render: renderJson },
    async execute(args, exec) {
      const sourceSessionId = args.session_id ?? currentSessionId(exec)
      return manager.related(sourceSessionId, {
        unitTag: args.unit_tag,
        developer: args.developer,
        outcomeType: args.outcome_type,
        limit: args.limit,
      }, exec.signal)
    },
  }))

  register(defineTool({
    name: 'session_reports',
    description: 'Read bounded Markdown reports or clue documents from another related Session\'s working directory. The target must share a target unit tag or developer. It never reads the session log and only reads reports/analysis/notes plus root Markdown files.',
    parameters: {
      session_id: { type: 'string', required: true, description: 'Related session whose target workspace should be read.' },
      max_files: { type: 'number', description: 'Maximum Markdown files to return.' },
      max_chars_per_file: { type: 'number', description: 'Maximum characters returned from each file.' },
      max_total_chars: { type: 'number', description: 'Maximum total characters returned across files.' },
    },
    output: { schema: { type: 'json' }, render: renderJson },
    async execute(args, exec) {
      const sourceSessionId = currentSessionId(exec)
      return manager.readReports(sourceSessionId, args.session_id, args, exec.signal)
    },
  }))
}
