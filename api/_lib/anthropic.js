import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-haiku-4-5-20251001'

// Built lazily (on first actual call) rather than at module load, since
// this module can be imported before api/_lib/supabase.js has had a chance
// to load ANTHROPIC_API_KEY from .env into process.env — constructing the
// client too early bakes in a missing key permanently.
let anthropic = null
function getClient() {
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return anthropic
}

// Calls Claude with a strict "JSON only" instruction and parses the result.
// Throws if the model doesn't return valid JSON — callers should catch and
// fall back gracefully rather than let a malformed response crash the request.
export async function askForJSON({ system, prompt, maxTokens = 1024 }) {
  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Model did not return JSON')
  return JSON.parse(jsonMatch[0])
}
