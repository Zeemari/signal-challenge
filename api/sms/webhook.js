import { getServerClient } from '../_lib/supabase.js'
import { normalizePhoneNumber, validateWebhookSignature } from '../_lib/sms.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Validate webhook signature if secret is configured
  if (process.env.SENDCHAMP_WEBHOOK_SECRET && process.env.NODE_ENV === 'production') {
    const isValid = validateWebhookSignature(req)
    if (!isValid) {
      console.warn('[SMS Webhook] Invalid Webhook Signature')
      return res.status(403).json({ error: 'Invalid signature' })
    }
  }

  try {
    const body = req.body || {}
    const from = body.phone_number || body.sender || body.From || body.from
    const bodyText = (body.message || body.body || body.Body || '').trim().toUpperCase()

    const phone = normalizePhoneNumber(from)
    const isStopWord = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].some((kw) => bodyText.includes(kw))

    if (phone && isStopWord) {
      const db = getServerClient()
      const now = new Date().toISOString()
      await db
        .from('sms_subscriptions')
        .update({ status: 'unsubscribed', updated_at: now })
        .eq('phone_number', phone)

      console.log(`[SMS Webhook]: Unsubscribed phone number ${phone} via inbound message keyword`)
    }

    return res.status(200).json({
      status: 'ok',
      message: isStopWord ? 'Unsubscribe processed' : 'Webhook received',
    })
  } catch (error) {
    console.error('[SMS Webhook Error]:', error)
    return res.status(500).json({ error: 'Webhook processing error' })
  }
}
