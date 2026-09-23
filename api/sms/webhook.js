import { getServerClient } from '../_lib/supabase.js'
import { normalizePhoneNumber, validateTwilioSignature } from '../_lib/sms.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Validate Twilio signature if auth token is set
  if (process.env.TWILIO_AUTH_TOKEN && process.env.NODE_ENV === 'production') {
    const isValid = validateTwilioSignature(req, req.body)
    if (!isValid) {
      console.warn('[SMS Webhook] Invalid Twilio Signature')
      return res.status(403).json({ error: 'Invalid signature' })
    }
  }

  try {
    const from = req.body?.From || req.body?.from
    const bodyText = (req.body?.Body || req.body?.body || '').trim().toUpperCase()

    const phone = normalizePhoneNumber(from)
    const isStopWord = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].some((kw) => bodyText.includes(kw))

    if (phone && isStopWord) {
      const db = getServerClient()
      const now = new Date().toISOString()
      await db
        .from('sms_subscriptions')
        .update({ status: 'unsubscribed', updated_at: now })
        .eq('phone_number', phone)
    }

    res.setHeader('Content-Type', 'text/xml')
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>You have been unsubscribed from SIGNAL safety alerts. Reply START to resubscribe anytime.</Message>
</Response>`)
  } catch (error) {
    console.error('[SMS Webhook Error]:', error)
    res.setHeader('Content-Type', 'text/xml')
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`)
  }
}
