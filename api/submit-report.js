import { askForJSON } from './_lib/anthropic.js'
import { getOptionalAuth, sendAuthError } from './_lib/auth.js'
import { getServerClient } from './_lib/supabase.js'
import { sendSMS, dispatchSignalAlerts } from './_lib/sms.js'

const SOURCES = new Set(['direct_observation', 'trusted_community', 'authority', 'phone', 'whatsapp', 'secondhand', 'unknown'])
const STATUSES = new Set(['emerging', 'corroborating', 'conflicting', 'unconfirmed', 'unsafe'])
const SITUATIONS = new Set(['safe', 'cautious', 'tense', 'dangerous', 'not_sure'])

function inputOf(body = {}) {
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  const location = typeof body.location === 'string' ? body.location.trim() : ''
  if (!content || content.length > 4000) throw Object.assign(new Error('Report text is required and must be under 4000 characters'), { status: 400 })
  if (!location || location.length > 200 || !SOURCES.has(body.source_type)) throw Object.assign(new Error('Invalid report fields'), { status: 400 })
  const date = body.reported_at ? new Date(body.reported_at) : new Date()
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now()) throw Object.assign(new Error('Invalid report time'), { status: 400 })
  const perceived_situation = SITUATIONS.has(body.perceived_situation) ? body.perceived_situation : 'not_sure'
  return {
    content,
    location,
    source_type: body.source_type,
    reported_at: date.toISOString(),
    category: typeof body.category === 'string' ? body.category.trim().slice(0, 80) : null,
    perceived_situation,
    state_id: body.state_id || null,
    lga_id: body.lga_id || null,
    location_id: body.location_id || null,
    custom_location_name: typeof body.custom_location_name === 'string' ? body.custom_location_name.trim() : null,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { user, profile } = await getOptionalAuth(req)
    const input = inputOf(req.body)
    const db = getServerClient()

    let responderName = null
    let institutionName = null
    let institutionType = null
    if (profile?.role === 'responder') {
      responderName = profile.display_name || user?.user_metadata?.display_name || (user?.email ? user.email.split('@')[0] : 'Responder')
      institutionName = profile.institution_name || null
      institutionType = profile.institution_type || null
    }

    let finalLocationId = input.location_id
    let finalLocationText = input.location

    // Handle community suggested custom location name
    if (input.lga_id && input.custom_location_name) {
      const { data: existingLoc } = await db
        .from('locations')
        .select('id, name, status')
        .eq('lga_id', input.lga_id)
        .ilike('name', input.custom_location_name)
        .maybeSingle()

      if (existingLoc) {
        finalLocationId = existingLoc.id
      } else {
        const { data: newLoc, error: newLocErr } = await db
          .from('locations')
          .insert({
            lga_id: input.lga_id,
            name: input.custom_location_name,
            source: 'community',
            status: 'pending',
            submitted_by: user?.id || null,
          })
          .select('id, name')
          .single()

        if (!newLocErr && newLoc) {
          finalLocationId = newLoc.id
        }
      }
    }

    const ai = await extract(input)
    const insertPayload = {
      content: input.content,
      location: finalLocationText,
      source_type: input.source_type,
      category: input.category || ai.event_type,
      reported_at: input.reported_at,
      ai_summary: ai.summary,
      ai_event_type: ai.event_type,
      ai_entities: Array.isArray(ai.entities) ? ai.entities : [],
      ai_urgency: ['low', 'medium', 'high'].includes(ai.urgency) ? ai.urgency : 'medium',
      ai_confidence: 'unverified',
    }

    if (user?.id) insertPayload.created_by = user.id
    if (responderName) insertPayload.responder_name = responderName
    if (institutionName) insertPayload.responder_institution_name = institutionName
    if (institutionType) insertPayload.responder_institution_type = institutionType
    if (input.perceived_situation) insertPayload.perceived_situation = input.perceived_situation
    if (finalLocationId) insertPayload.location_id = finalLocationId
    if (input.state_id) insertPayload.state_id = input.state_id
    if (input.lga_id) insertPayload.lga_id = input.lga_id

    let report = null
    let reportError = null

    const initialInsert = await db.from('reports').insert(insertPayload).select(`
      *,
      location_ref:locations (
        id,
        name,
        status,
        source
      )
    `).single()

    report = initialInsert.data
    reportError = initialInsert.error

    if (reportError && (reportError.message?.toLowerCase().includes('column') || reportError.code === 'PGRST204')) {
      const basePayload = {
        content: input.content,
        location: finalLocationText,
        source_type: input.source_type,
        category: input.category || ai.event_type,
        reported_at: input.reported_at,
        ai_summary: ai.summary,
        ai_event_type: ai.event_type,
        ai_entities: Array.isArray(ai.entities) ? ai.entities : [],
        ai_urgency: ['low', 'medium', 'high'].includes(ai.urgency) ? ai.urgency : 'medium',
        ai_confidence: 'unverified',
      }
      if (user?.id) basePayload.created_by = user.id
      const retryInsert = await db.from('reports').insert(basePayload).select().single()
      report = retryInsert.data
      reportError = retryInsert.error
    }

    if (reportError) throw reportError

    const signal = await findOrCreateSignal(db, input, ai)
    const { error: linkError } = await db.from('reports').update({ signal_id: signal.id }).eq('id', report.id)
    if (linkError) console.error('Signal link error:', linkError)

    const updated = await classifyAndUpdate(db, signal, input.location)

    const isVerifiedCorrespondent = !!(profile?.is_verified_correspondent || profile?.is_verified_informant || responderName)

    dispatchSignalAlerts(db, updated, {
      previousStatus: signal.status,
      isPriority: isVerifiedCorrespondent,
      trustIndicator: isVerifiedCorrespondent ? 'single_trusted_contact' : (updated.source_trust_indicator || 'multi_report_corroborated'),
      category: input.category || ai.event_type || 'safety update',
    }).catch((e) =>
      console.error('[Citizen SMS Alert Error]:', e)
    )

    const isDangerous = input.perceived_situation === 'dangerous' || ai.urgency === 'high' || updated.status === 'unsafe'
    if (isDangerous) {
      alertResponders(db, { location: finalLocationText, summary: ai.summary, signalId: signal.id }).catch((e) =>
        console.error('[Danger Alert] Failed to notify responders:', e)
      )
    }

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
      system: 'Extract neutral JSON with summary, event_type, entities, urgency, and trust_indicator from this report. Use only stated details.',
      prompt: `Report: ${input.content}`, maxTokens: 512,
    })
  } catch (extractErr) {
    console.error('[AI Extract Execution Error]:', {
      name: extractErr?.name,
      message: extractErr?.message,
      status: extractErr?.status || extractErr?.statusCode,
    })
    return { summary: input.content, event_type: input.category || 'other', entities: [], urgency: 'medium', trust_indicator: 'single_trusted_contact' }
  }
}

async function findOrCreateSignal(db, input, ai) {
  let candidate = null

  // 1. Match by location_id if supplied
  if (input.location_id) {
    const { data: locMatches } = await db
      .from('signals')
      .select('*')
      .eq('location_id', input.location_id)
      .order('last_updated', { ascending: false })
      .limit(1)
    if (locMatches?.[0]) candidate = locMatches[0]
  }

  // 2. Fallback: Match by primary landmark segment
  if (!candidate && input.location) {
    const landmark = input.location.split(',')[0].trim()
    const { data: textMatches } = await db
      .from('signals')
      .select('*')
      .ilike('location', `%${landmark}%`)
      .order('last_updated', { ascending: false })
      .limit(1)
    if (textMatches?.[0]) candidate = textMatches[0]
  }

  if (candidate) return candidate

  const insertPayload = {
    title: input.location,
    location: input.location,
    status: 'emerging',
    summary: ai.summary,
    why_explanation: [{ type: 'warning', text: 'Only one report so far — not yet corroborated' }],
    last_updated: input.reported_at,
  }
  if (input.location_id) insertPayload.location_id = input.location_id
  if (input.lga_id) insertPayload.lga_id = input.lga_id

  const result = await db.from('signals').insert(insertPayload).select().single()
  if (result.error && (result.error.message?.includes('column') || result.error.code === 'PGRST204')) {
    const fallbackResult = await db.from('signals').insert({
      title: input.location,
      location: input.location,
      status: 'emerging',
      summary: ai.summary,
      why_explanation: [{ type: 'warning', text: 'Only one report so far — not yet corroborated' }],
      last_updated: input.reported_at,
    }).select().single()
    if (fallbackResult.error) throw fallbackResult.error
    return fallbackResult.data
  }
  if (result.error) throw result.error
  return result.data
}

async function alertResponders(db, { location, summary, signalId }) {
  const { data: staff, error } = await db
    .from('profiles')
    .select('phone')
    .in('role', ['responder', 'admin'])
    .eq('is_active', true)
    .eq('sms_alerts_enabled', true)
    .not('phone', 'is', null)
  if (error) throw error
  if (!staff?.length) return

  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.PUBLIC_APP_URL
  const link = baseUrl ? ` ${baseUrl}/signal/${signalId}` : ''
  const body = `SIGNAL ALERT: A dangerous situation was reported at ${location}. ${summary}${link}`.slice(0, 480)

  await Promise.all(staff.map((s) => sendSMS(s.phone, body)))
}

async function classifyAndUpdate(db, signal, location) {
  const result = await db.from('reports').select('*')
    .eq('signal_id', signal.id).order('reported_at', { ascending: false })
  if (result.error) throw result.error

  const reportsList = result.data || []
  const hasVerifiedCorrespondent = reportsList.some((r) => r.responder_name)

  let classification = null
  try {
    classification = await askForJSON({
      system: 'Classify reports as emerging, corroborating, conflicting, unsafe, or unconfirmed. Analyze all reports based on date/recency, location, source, and information provided. Write "summary" as a DETAILED situation report (2-4 sentences) compiling all reports. If a verified correspondent or official authority reports dangerous activity, classify status as "unsafe". Return status, summary, source_trust_indicator, and why_explanation array.',
      prompt: `Location: ${location}\nTotal Reports: ${reportsList.length}\nReports List:\n${reportsList.map((r) => `- [${r.source_type}${r.responder_name ? ` (${r.responder_name})` : ''}, reported_at=${r.reported_at}]: ${r.content}`).join('\n')}`,
      maxTokens: 768,
    })
  } catch (classifyErr) {
    console.error('[AI Classification Execution Error]:', {
      name: classifyErr?.name,
      message: classifyErr?.message,
      status: classifyErr?.status || classifyErr?.statusCode,
    })
  }

  const finalStatus = hasVerifiedCorrespondent && (classification?.status === 'unsafe' || classification?.status === 'emerging')
    ? 'unsafe'
    : (STATUSES.has(classification?.status) ? classification.status : signal.status)

  const defaultWhy = hasVerifiedCorrespondent
    ? [{ type: 'danger', text: 'Verified correspondent report filed for this location' }]
    : (reportsList.length > 1 ? [{ type: 'info', text: `${reportsList.length} corroborating community reports` }] : signal.why_explanation)

  const update = await db.from('signals').update({
    status: finalStatus,
    summary: classification?.summary || signal.summary,
    why_explanation: Array.isArray(classification?.why_explanation) ? classification.why_explanation : defaultWhy,
    last_updated: new Date().toISOString(),
  }).eq('id', signal.id).select().single()

  if (update.error) throw update.error
  return { ...update.data, source_trust_indicator: classification?.source_trust_indicator || (hasVerifiedCorrespondent ? 'single_trusted_contact' : 'multi_report_corroborated') }
}
