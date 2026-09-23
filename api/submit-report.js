import { askForJSON } from './_lib/anthropic.js'
import { getOptionalAuth, sendAuthError } from './_lib/auth.js'
import { getServerClient } from './_lib/supabase.js'

const SOURCES = new Set(['direct_observation', 'trusted_community', 'authority', 'phone', 'whatsapp', 'secondhand', 'unknown'])
const STATUSES = new Set(['emerging', 'corroborating', 'conflicting', 'unconfirmed'])
const SITUATIONS = new Set(['safe', 'cautious', 'tense', 'dangerous', 'not_sure'])

function inputOf(body = {}) {
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  const location = typeof body.location === 'string' ? body.location.trim() : ''
  if (!content || content.length > 4000) throw Object.assign(new Error('Report text is required and must be under 4000 characters'), { status: 400 })
  if (!location || location.length > 200 || !SOURCES.has(body.source_type)) throw Object.assign(new Error('Invalid report fields'), { status: 400 })
  const date = body.reported_at ? new Date(body.reported_at) : new Date()
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now()) throw Object.assign(new Error('Invalid report time'), { status: 400 })
  const perceived_situation = SITUATIONS.has(body.perceived_situation) ? body.perceived_situation : 'not_sure'
  return { content, location, source_type: body.source_type, reported_at: date.toISOString(), category: typeof body.category === 'string' ? body.category.trim().slice(0, 80) : null, perceived_situation }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { user, profile } = await getOptionalAuth(req)
    const input = inputOf(req.body)
    const db = getServerClient()

    let responderName = null
    if (profile?.role === 'responder') {
      responderName = profile.display_name || user?.user_metadata?.display_name || (user?.email ? user.email.split('@')[0] : 'Responder')
    }

    const ai = await extract(input)
    const insertPayload = {
      content: input.content,
      location: input.location,
      source_type: input.source_type,
      category: input.category || ai.event_type,
      reported_at: input.reported_at,
      ai_summary: ai.summary,
      ai_event_type: ai.event_type,
      ai_entities: Array.isArray(ai.entities) ? ai.entities : [],
      ai_urgency: ['low', 'medium', 'high'].includes(ai.urgency) ? ai.urgency : 'medium',
      ai_confidence: 'unverified',
    }

    if (user?.id) {
      insertPayload.created_by = user.id
    }
    if (responderName) {
      insertPayload.responder_name = responderName
    }
    if (input.perceived_situation) {
      insertPayload.perceived_situation = input.perceived_situation
    }

    let report = null
    let reportError = null

    const initialInsert = await db.from('reports').insert(insertPayload).select().single()
    report = initialInsert.data
    reportError = initialInsert.error

    if (reportError && (reportError.message?.toLowerCase().includes('column') || reportError.code === 'PGRST204')) {
      const basePayload = {
        content: input.content,
        location: input.location,
        source_type: input.source_type,
        category: input.category || ai.event_type,
        reported_at: input.reported_at,
        ai_summary: ai.summary,
        ai_event_type: ai.event_type,
        ai_entities: Array.isArray(ai.entities) ? ai.entities : [],
        ai_urgency: ['low', 'medium', 'high'].includes(ai.urgency) ? ai.urgency : 'medium',
        ai_confidence: 'unverified',
      }
      const retryInsert = await db.from('reports').insert(basePayload).select().single()
      report = retryInsert.data
      reportError = retryInsert.error
    }

    if (reportError) throw reportError

    const signal = await findOrCreateSignal(db, input, ai)
    const { error: linkError } = await db.from('reports').update({ signal_id: signal.id }).eq('id', report.id)
    if (linkError) console.error('Signal link error:', linkError)

    const updated = await classifyAndUpdate(db, signal, input.location)
    return res.status(200).json({ report: { ...report, signal_id: signal.id }, signal: updated })
  } catch (error) {
    if (error?.status === 400) return res.status(400).json({ error: error.message })
    if (error?.status === 401 || error?.status === 403) return sendAuthError(res, error)
    console.error('[Submit Report Error]:', error)
    return res.status(500).json({ error: error.message || error.details || 'Unable to process the report' })
  }
}

async function extract(input) {
  try {
    return await askForJSON({
      system: 'Extract neutral JSON with summary, event_type, entities, and urgency from this report. Use only stated details.',
      prompt: `Report: ${input.content}`, maxTokens: 512,
    })
  } catch {
    return { summary: input.content, event_type: input.category || 'other', entities: [], urgency: 'medium' }
  }
}

async function findOrCreateSignal(db, input, ai) {
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const { data: candidates, error } = await db.from('signals').select('*')
    .ilike('location', input.location).gte('last_updated', since)
    .order('last_updated', { ascending: false }).limit(1)
  if (error) throw error
  if (candidates?.[0]) return candidates[0]
  const result = await db.from('signals').insert({
    title: input.location, location: input.location, status: 'emerging',
    summary: ai.summary, why_explanation: [{ type: 'warning', text: 'Only one report so far — not yet corroborated' }],
    last_updated: input.reported_at,
  }).select().single()
  if (result.error) throw result.error
  return result.data
}

async function classifyAndUpdate(db, signal, location) {
  const result = await db.from('reports').select('source_type, reported_at, content')
    .eq('signal_id', signal.id).order('reported_at', { ascending: false })
  if (result.error) throw result.error
  let classification = null
  try {
    classification = await askForJSON({
      system: 'Classify reports as emerging, corroborating, conflicting, or unconfirmed. Never call a location safe or dangerous. Return status, summary, and why_explanation.',
      prompt: `Location: ${location}\n${result.data.map((r) => `- ${r.source_type} ${r.reported_at}: ${r.content}`).join('\n')}`,
      maxTokens: 768,
    })
  } catch {}
  const update = await db.from('signals').update({
    status: STATUSES.has(classification?.status) ? classification.status : signal.status,
    summary: classification?.summary || signal.summary,
    why_explanation: classification?.why_explanation || signal.why_explanation,
    last_updated: new Date().toISOString(),
  }).eq('id', signal.id).select().single()
  if (update.error) throw update.error
  return update.data
}
