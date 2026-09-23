import { askForJSON as askForJSONDeepSeek } from './deepseek.js'

/**
 * AI Provider Delegate
 * Re-routes askForJSON calls to DeepSeek AI engine using DEEPSEEK_API_KEY.
 */
export async function askForJSON(options) {
  return await askForJSONDeepSeek(options)
}
