import { getServerClient } from './_lib/supabase.js'
import { askForJSON } from './_lib/anthropic.js'

const ASK_SYSTEM = `You answer a question about a specific location using ONLY the reports provided to you.
Rules:
- Never declare the location "safe" or "dangerous". Describe only what was reported and how well it's corroborated.
- Never state or imply that a report is confirmed, verified, or certain — these are unverified community reports. Frame "current_picture" as a hedged situation report the reader should apply with caution, not a conclusion.
- Never invent reports, counts, or details that are not in the provided data.
- If the reports disagree, say so plainly instead of picking one as true.
- "current_picture" must be detailed, 2-4 sentences: state the report count and source mix (direct/second-hand/authority/etc.), AND the specific details actually mentioned in the reports (what was seen/heard, numbers/timing if stated) — attributed to the reports ("reports describe...") rather than asserted as fact. e.g.: "4 reports have been received around <location> in the last 12 minutes. 2 direct observations describe 3 motorcycles speeding through and people turning back; 2 second-hand reports mention shouting and stopped traffic. ..."
- "what_supports_this" is a short list of evidence strings (e.g. "2 direct observations", "Reports occurred within 12 minutes").
- "what_is_unknown" is a short list of explicit unknowns — never leave this empty.
- Respond with ONLY a JSON object, no other text:
{
  "current_picture": "...",
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

    // Plain substring matching breaks two ways: punctuation/word-order
    // differences, and — since the location picker stores reports as
    // "<landmark>, <LGA>, <State>" — a question naming just the landmark
    // ("Mopol Junction") won't contain the LGA/state text at all.
    // Normalize both sides, and match on the landmark segment alone before
    // falling back to the full qualified string.
    const normalize = (text) =>
      text
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

    if (!matchedSignal) {
      return res.status(200).json({
        matched: false,
        current_picture: "SIGNAL doesn't have any reports for that location yet.",
        what_supports_this: [],
        what_is_unknown: ['No reports have been received for this location.'],
        last_updated: null,
      })
    }

    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select('*')
      .eq('signal_id', matchedSignal.id)
      .order('reported_at', { ascending: false })
    if (reportsError) throw reportsError

    let answer
    try {
      const reportLines = reports
        .map((r) => `- [${r.source_type}, reported_at=${r.reported_at}] ${r.content}`)
        .join('\n')
      answer = await askForJSON({
        system: ASK_SYSTEM,
        prompt: `Question: "${question}"\nLocation: ${matchedSignal.location}\nCurrent time: ${new Date().toISOString()}\nReports:\n${reportLines}`,
        maxTokens: 768,
      })
    } catch {
      answer = {
        current_picture: matchedSignal.summary,
        what_supports_this: [`${reports.length} report(s) on record`],
        what_is_unknown: ['The nature of the activity has not been independently confirmed.'],
      }
    }

    return res.status(200).json({
      matched: true,
      ...answer,
      last_updated: matchedSignal.last_updated,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message ?? 'Unexpected error' })
  }
}
