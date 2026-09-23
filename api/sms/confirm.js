import { getServerClient } from '../_lib/supabase.js'
import { normalizePhoneNumber } from '../_lib/sms.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { subscription_id, code, phone_number } = req.body || {}

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Confirmation code is required' })
    }

    const db = getServerClient()

    let query = db.from('sms_subscriptions').select('*')
    if (subscription_id) {
      query = query.eq('id', subscription_id)
    } else if (phone_number) {
      const normalized = normalizePhoneNumber(phone_number)
      if (!normalized) return res.status(400).json({ error: 'Invalid phone number format' })
      query = query.eq('phone_number', normalized).eq('status', 'pending')
    } else {
      return res.status(400).json({ error: 'subscription_id or phone_number is required' })
    }

    const { data: sub, error } = await query.maybeSingle()

    if (error || !sub) {
      return res.status(404).json({ error: 'Pending subscription not found' })
    }

    // Rate limiting verification attempts
    if (sub.attempts_count >= 5) {
      return res.status(429).json({ error: 'Maximum code verification attempts exceeded. Please request a new code.' })
    }

    // Check code expiry
    if (!sub.confirmation_expires_at || new Date(sub.confirmation_expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Confirmation code has expired. Please request a new code.' })
    }

    // Validate code string
    const trimmedCode = code.trim()
    if (sub.confirmation_code !== trimmedCode) {
      // Increment attempt counter
      await db
        .from('sms_subscriptions')
        .update({ attempts_count: sub.attempts_count + 1 })
        .eq('id', sub.id)

      return res.status(400).json({ error: 'Incorrect confirmation code' })
    }

    // Activate subscription and clear confirmation code
    const now = new Date().toISOString()
    const { error: updateErr } = await db
      .from('sms_subscriptions')
      .update({
        status: 'active',
        confirmation_code: null,
        confirmation_expires_at: null,
        updated_at: now,
      })
      .eq('id', sub.id)

    if (updateErr) throw updateErr

    return res.status(200).json({
      success: true,
      message: 'Subscription activated! You will receive SMS alerts for safety updates in this location.',
    })
  } catch (error) {
    console.error('[SMS Confirm Error]:', error)
    const errMsg = error.message || error.details || ''
    if (errMsg.includes('sms_subscriptions') || errMsg.includes('schema cache') || error.code === 'PGRST200' || error.code === '42P01') {
      return res.status(500).json({
        error: 'Database table "sms_subscriptions" is missing. Please run "supabase/010_sms_subscriptions.sql" in your Supabase SQL Editor.',
      })
    }
    return res.status(500).json({ error: errMsg || 'Failed to confirm SMS subscription' })
  }
}
