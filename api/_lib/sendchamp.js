/**
 * Sendchamp SMS Service Client
 * Handles outbound SMS delivery via Sendchamp REST API, with fallback mock mode for local testing.
 */

export async function sendSms({ to, message }) {
  const providerMode = (process.env.SMS_PROVIDER_MODE || '').toLowerCase()
  const apiKey = process.env.SENDCHAMP_API_KEY
  const senderName = process.env.SENDCHAMP_SENDER_NAME || 'SIGNAL'
  const route = process.env.SENDCHAMP_SMS_ROUTE || 'dnd'

  // Clean phone number: Sendchamp expects international format without leading + (e.g., "2348142414145")
  const recipient = typeof to === 'string' ? to.replace(/^\+/, '').trim() : ''

  if (!recipient) {
    return { success: false, provider: 'sendchamp', error: 'No recipient phone number provided' }
  }

  // Mock / Demo mode for testing without hitting live credits
  if (providerMode === 'mock' || !apiKey) {
    if (!apiKey && providerMode !== 'mock') {
      console.warn('[Sendchamp SMS] SENDCHAMP_API_KEY is not set in environment. Defaulting to mock mode.')
    }
    console.log(`[Sendchamp SMS Mock Mode]: Sending to=${recipient}, sender=${senderName}, route=${route}`)
    console.log(`[Sendchamp SMS Body]: "${message}"`)
    return {
      success: true,
      provider: 'sendchamp',
      providerMessageId: `mock_sc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      status: 'sent',
    }
  }

  try {
    const response = await fetch('https://api.sendchamp.com/api/v1/sms/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: [recipient],
        message,
        sender_name: senderName,
        route,
      }),
    })

    const data = await response.json().catch(() => ({}))

    if (response.ok && (data.status === 'success' || data.code === 200)) {
      const messageId = data.data?.id || data.data?.business_id || data.data?.reference || null
      return {
        success: true,
        provider: 'sendchamp',
        providerMessageId: messageId,
        status: 'sent',
      }
    }

    const errorMsg = data.message || data.error || `HTTP ${response.status} ${response.statusText}`
    console.error(`[Sendchamp SMS Failed] to ${recipient}:`, errorMsg)
    return {
      success: false,
      provider: 'sendchamp',
      error: errorMsg,
    }
  } catch (err) {
    console.error(`[Sendchamp SMS Exception] to ${recipient}:`, err.message)
    return {
      success: false,
      provider: 'sendchamp',
      error: err.message,
    }
  }
}

/**
 * Validates Sendchamp inbound webhook signature if token/secret is provided.
 */
export function validateSendchampSignature(req) {
  const secret = process.env.SENDCHAMP_WEBHOOK_SECRET
  if (!secret) return true // If secret is not set, allow webhook requests
  const signature = req.headers?.['x-sendchamp-signature'] || req.headers?.['x-webhook-signature']
  if (!signature) return false
  return signature === secret
}
