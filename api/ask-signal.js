import { getServerClient } from './_lib/supabase.js'
import { askForJSON } from './_lib/anthropic.js'

const ASK_SYSTEM = `You analyze ALL reports provided for a specific location and generate an evidence-based situation summary.
Rules:
1. RELEVANCE & SYNTHESIS:
   - Evaluate all provided reports based on their date/recency, location match, source reliability (verified correspondent, authority, direct observation vs secondhand), AND the specific information provided.
   - Prioritize recent reports while contextualizing older historical reports.
2. CAUTION GUIDANCE & VERDICT:
   - Never declare an absolute permanent verdict.
   - Dynamically determine "caution_guidance" (e.g. "Apply with caution", "High caution advised", "Corroborated reports") based on evidence quality and recency.
3. VERIFIED CORRESPONDENT / UNSAFE BADGING:
   - If any report comes from a verified correspondent, authority, or official institution reporting an active threat or dangerous incident, set "is_unsafe": true and provide "unsafe_badge_reason". Otherwise set "is_unsafe": false.
4. SOURCES SUMMARY:
   - Provide a concise array of source attribution strings in "sources_summary" (e.g. ["6 direct observations", "1 verified correspondent report"]).
5. OUTPUT FORMAT:
   - Respond with ONLY a JSON object:
   {
     "current_picture": "Detailed 2-4 sentence situation report attributing details (timing, vehicles, crowd size, noise) to the reports.",
     "caution_guidance": "Dynamic caution tag",
     "is_unsafe": false,
     "unsafe_badge_reason": null,
     "sources_summary": ["...", "..."],
     "what_supports_this": ["...", "..."],
     "what_is_unknown": ["...", "..."]
   }`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = getServerClient()
    const { question } = req.body
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'question is required' })
    }

    const { data: signals, error: signalsError } = await supabase.from('signals').select('*')
    if (signalsError) throw signalsError

    const normalize = (text) =>
      (text || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()

    const normalizedQuestion = normalize(question)
    const matchedSignal = signals?.find((s) => {
      const fullLoc = normalize(s.location)
      if (!fullLoc) return false
      if (normalizedQuestion.includes(fullLoc)) return true

      const primarySegment = normalize(s.location.split(',')[0] || '')
      if (primarySegment && normalizedQuestion.includes(primarySegment)) return true

      const words = fullLoc.split(' ')
      return words.length > 0 && words.every((w) => normalizedQuestion.includes(w))
    })

    // Determine search terms and location_id
    const landmarkText = matchedSignal
      ? matchedSignal.location.split(',')[0].trim()
      : question.trim().split(' ')[0]

    let reportsQuery = supabase.from('reports').select('*')

    if (matchedSignal?.location_id) {
      reportsQuery = reportsQuery.or(`location_id.eq.${matchedSignal.location_id},location.ilike.%${landmarkText}%`)
    } else {
      reportsQuery = reportsQuery.ilike('location', `%${landmarkText}%`)
    }

    const { data: reports, error: reportsError } = await reportsQuery.order('reported_at', { ascending: false })
    if (reportsError) throw reportsError

    if (!reports || reports.length === 0) {
      return res.status(200).json({
        matched: false,
        current_picture: "SIGNAL doesn't have any reports for that location yet.",
        caution_guidance: "No reports on record",
        is_unsafe: false,
        sources_summary: [],
        what_supports_this: [],
        what_is_unknown: ['No reports have been received for this location.'],
        last_updated: null,
      })
    }

    let answer
    try {
      const reportLines = reports
        .map(
          (r) =>
            `- [Source: ${r.source_type}${r.responder_name ? ` (${r.responder_name}, ${r.responder_institution_name || 'Verified Correspondent'})` : ''}, reported_at=${r.reported_at}, perceived=${r.perceived_situation || 'unknown'}] ${r.content}`
        )
        .join('\n')

      answer = await askForJSON({
        system: ASK_SYSTEM,
        prompt: `Question: "${question}"\nTarget Location: ${matchedSignal?.location || question}\nCurrent Time: ${new Date().toISOString()}\nTotal System Reports Found: ${reports.length}\nReports List:\n${reportLines}`,
        maxTokens: 1024,
      })
    } catch (askErr) {
      console.error('[Ask SIGNAL AI Execution Error]:', {
        name: askErr?.name,
        message: askErr?.message,
        status: askErr?.status || askErr?.statusCode,
      })
      const isUnsafeReport = reports.some(
        (r) => r.perceived_situation === 'dangerous' || r.responder_name
      )
      answer = {
        current_picture: matchedSignal?.summary || `Received ${reports.length} report(s) for this location.`,
        caution_guidance: 'Apply with caution',
        is_unsafe: isUnsafeReport,
        unsafe_badge_reason: isUnsafeReport ? 'Dangerous conditions or verified correspondent report on record' : null,
        sources_summary: [`${reports.length} report(s) on record`],
        what_supports_this: [`${reports.length} report(s) found in system`],
        what_is_unknown: ['The nature of the activity has not been independently confirmed.'],
      }
    }

    const lastUpdated = reports[0]?.reported_at || matchedSignal?.last_updated || new Date().toISOString()

    return res.status(200).json({
      matched: true,
      location: matchedSignal?.location || question,
      total_reports_analyzed: reports.length,
      ...answer,
      last_updated: lastUpdated,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message ?? 'Unexpected error' })
  }
}
