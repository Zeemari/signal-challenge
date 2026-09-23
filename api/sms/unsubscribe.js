import { getServerClient } from '../_lib/supabase.js'
import { normalizePhoneNumber } from '../_lib/sms.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { phone_number, subscription_id } = req.body || {}

    const db = getServerClient()
    const now = new Date().toISOString()

    if (subscription_id) {
      const { error } = await db
        .from('sms_subscriptions')
        .update({ status: 'unsubscribed', updated_at: now })
        .eq('id', subscription_id)

      if (error) throw error
      return res.status(200).json({ success: true, message: 'Successfully unsubscribed from safety alerts.' })
    }

    if (phone_number) {
      const phone = normalizePhoneNumber(phone_number)
      if (!phone) {
        return res.status(400).json({ error: 'Invalid phone number format' })
      }

      const { error } = await db
        .from('sms_subscriptions')
        .update({ status: 'unsubscribed', updated_at: now })
        .eq('phone_number', phone)

      if (error) throw error
      return res.status(200).json({ success: true, message: 'Successfully unsubscribed all subscriptions for this phone number.' })
    }

    return res.status(400).json({ error: 'phone_number or subscription_id is required' })
  } catch (error) {
    console.error('[SMS Unsubscribe Error]:', error)
    return res.status(500).json({ error: error.message || 'Failed to unsubscribe' })
  }
}
