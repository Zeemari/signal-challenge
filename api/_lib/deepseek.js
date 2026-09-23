/**
 * DeepSeek AI Client Helper
 * Uses DeepSeek API (deepseek-chat) with native JSON response mode for report extraction,
 * signal classification, and Ask SIGNAL evidence compilation.
 */

export async function askForJSON({ system, prompt, maxTokens = 1024 }) {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    console.error('[DeepSeek AI Error]: DEEPSEEK_API_KEY is not set in environment.')
    throw new Error('DEEPSEEK_API_KEY is missing')
  }

  // DeepSeek API requires the word "json" to be present in prompt/system message when using response_format: json_object
  let finalSystem = system || ''
  let finalPrompt = prompt || ''

  const combined = `${finalSystem} ${finalPrompt}`.toLowerCase()
  if (!combined.includes('json')) {
    finalSystem = `${finalSystem}\nRespond with JSON format.`
  }

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: finalSystem },
          { role: 'user', content: finalPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: maxTokens,
        temperature: 0.2,
      }),
    })

    const rawText = await response.text()

    if (!response.ok) {
      console.error('[DeepSeek API Execution Error]:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: rawText,
      })
      throw new Error(`DeepSeek API error ${response.status}: ${rawText}`)
    }

    const data = JSON.parse(rawText)
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      console.error('[DeepSeek AI Error]: Empty message content in response:', rawText)
      throw new Error('DeepSeek API returned empty response content')
    }

    const parsed = JSON.parse(content)
    return parsed
  } catch (error) {
    console.error('[DeepSeek API Execution Error]:', {
      name: error.name,
      message: error.message,
    })
    throw error
  }
}
