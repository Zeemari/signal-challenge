import { supabase } from './_lib/supabase.js'
import { askForJSON } from './_lib/anthropic.js'

const ASK_SYSTEM = `You answer a question about a specific location using ONLY the reports provided to you.
Rules:
- Never declare the location "safe" or "dangerous". Describe only what was reported and how well it's corroborated.
- Never invent reports, counts, or details that are not in the provided data.
- If the reports disagree, say so plainly instead of picking one as true.
- "current_picture" should read like: "N reports have been received around <location> in the last Y minutes. A are direct observations and B are second-hand. ..."
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
    const { question } = req.body
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'question is required' })
    }

    const { data: signals, error: signalsError } = await supabase.from('signals').select('*')
    if (signalsError) throw signalsError

    const lowerQuestion = question.toLowerCase()
    const matchedSignal = signals?.find((s) => lowerQuestion.includes(s.location.toLowerCase()))

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
