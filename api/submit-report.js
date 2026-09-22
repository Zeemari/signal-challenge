import { supabase } from './_lib/supabase.js'
import { askForJSON } from './_lib/anthropic.js'

const CLUSTER_WINDOW_MINUTES = 30

const EXTRACTION_SYSTEM = `You extract structured information from a single community safety report.
Rules:
- Only use information present in the report text. Never invent details, numbers, or names that are not stated.
- Never assess whether an area is "safe" or "dangerous" — that is not your job.
- "confidence" must always be "unverified" unless the report itself says an authority independently confirmed it.
- Respond with ONLY a JSON object, no other text, matching this shape:
{
  "summary": "short neutral summary of what was reported, 1 sentence",
  "event_type": "short snake_case category, e.g. road_activity, gathering, other",
  "entities": ["short phrases pulled directly from the text, e.g. '3 motorcycles'"],
  "urgency": "low" | "medium" | "high",
  "confidence": "unverified"
}`

const CLASSIFY_SYSTEM = `You classify a cluster of community reports about the same location and write a short status summary.
Rules:
- Never declare a location "safe" or "dangerous". Describe only what was reported and how well it's corroborated.
- If reports agree or describe the same developing situation, status is "corroborating" (or "emerging" if there's only 1-2 reports so far).
- If reports give clearly different accounts (e.g. one says clear, another says blocked), status is "conflicting".
- If the most recent report is more than 30 minutes old, status is "unconfirmed".
- "summary" must be 1-3 hedged sentences in the style of: "X reports have been received around <location> in the last Y minutes. N are direct observations and M are second-hand. The reports appear to describe [pattern], but [what's not confirmed]."
- "why_explanation" is a list of short evidence bullets, each {"type": "positive"|"warning", "text": "..."}. Always include at least one "warning" bullet naming what remains unconfirmed.
- Respond with ONLY a JSON object, no other text:
{
  "status": "emerging" | "corroborating" | "conflicting" | "unconfirmed",
  "summary": "...",
  "why_explanation": [{"type": "positive", "text": "..."}, {"type": "warning", "text": "..."}]
}`

function normalizeLocation(loc) {
  return loc.trim().toLowerCase()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { content, location, source_type, category, reported_at } = req.body

    if (!content || !location || !source_type) {
      return res.status(400).json({ error: 'content, location, and source_type are required' })
    }

    const reportedAt = reported_at ? new Date(reported_at).toISOString() : new Date().toISOString()

    let extracted
    try {
      extracted = await askForJSON({
        system: EXTRACTION_SYSTEM,
        prompt: `Report: "${content}"`,
        maxTokens: 512,
      })
    } catch {
      // Fall back to raw content rather than blocking submission on an AI failure.
      extracted = {
        summary: content,
        event_type: category || 'other',
        entities: [],
        urgency: 'medium',
        confidence: 'unverified',
      }
    }

    const { data: insertedReport, error: insertError } = await supabase
      .from('reports')
      .insert({
        content,
        location,
        source_type,
        category: category || extracted.event_type,
        reported_at: reportedAt,
        ai_summary: extracted.summary,
        ai_event_type: extracted.event_type,
        ai_entities: extracted.entities ?? [],
        ai_urgency: extracted.urgency ?? 'medium',
        ai_confidence: 'unverified',
      })
      .select()
      .single()

    if (insertError) throw insertError

    const windowStart = new Date(Date.now() - CLUSTER_WINDOW_MINUTES * 60 * 1000).toISOString()
    const { data: candidateSignals, error: candidatesError } = await supabase
      .from('signals')
      .select('*')
      .ilike('location', location)
      .gte('last_updated', windowStart)
      .order('last_updated', { ascending: false })
      .limit(1)

    if (candidatesError) throw candidatesError

    let signal = candidateSignals?.[0] ?? null

    if (!signal) {
      const { data: newSignal, error: createError } = await supabase
        .from('signals')
        .insert({
          title: location,
          location,
          status: 'emerging',
          summary: extracted.summary,
          why_explanation: [{ type: 'warning', text: 'Only one report so far — not yet corroborated' }],
          last_updated: reportedAt,
        })
        .select()
        .single()
      if (createError) throw createError
      signal = newSignal
    }

    const { error: linkError } = await supabase
      .from('reports')
      .update({ signal_id: signal.id })
      .eq('id', insertedReport.id)
    if (linkError) throw linkError

    const { data: clusterReports, error: clusterError } = await supabase
      .from('reports')
      .select('*')
      .eq('signal_id', signal.id)
      .order('reported_at', { ascending: false })
    if (clusterError) throw clusterError

    let classification
    try {
      const reportLines = clusterReports
        .map((r) => `- [${r.source_type}, reported_at=${r.reported_at}] ${r.content}`)
        .join('\n')
      classification = await askForJSON({
        system: CLASSIFY_SYSTEM,
        prompt: `Location: ${location}\nCurrent time: ${new Date().toISOString()}\nReports:\n${reportLines}`,
        maxTokens: 768,
      })
    } catch {
      classification = null
    }

    const { data: updatedSignal, error: updateError } = await supabase
      .from('signals')
      .update({
        status: classification?.status ?? signal.status,
        summary: classification?.summary ?? signal.summary,
        why_explanation: classification?.why_explanation ?? signal.why_explanation,
        last_updated: new Date().toISOString(),
      })
      .eq('id', signal.id)
      .select()
      .single()
    if (updateError) throw updateError

    return res.status(200).json({
      report: { ...insertedReport, signal_id: signal.id },
      signal: updatedSignal,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message ?? 'Unexpected error' })
  }
}
