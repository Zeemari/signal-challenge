import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = 'claude-haiku-4-5-20251001'

// Calls Claude with a strict "JSON only" instruction and parses the result.
// Throws if the model doesn't return valid JSON — callers should catch and
// fall back gracefully rather than let a malformed response crash the request.
export async function askForJSON({ system, prompt, maxTokens = 1024 }) {
  const message = await anthropic.messages.create({
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
