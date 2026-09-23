import { getServerClient } from '../_lib/supabase.js'
import { normalizePhoneNumber, generateOtp, sendSMS } from '../_lib/sms.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const rawPhone = req.body?.phone_number
    let locationId = req.body?.location_id || null
    let lgaId = req.body?.lga_id || null
    const locationText = typeof req.body?.location_text === 'string' ? req.body.location_text.trim() : ''
    const locationName = typeof req.body?.location_name === 'string' ? req.body.location_name.trim() : ''

    const phone = normalizePhoneNumber(rawPhone)
    if (!phone) {
      return res.status(400).json({ error: 'Invalid phone number format. Please include country code e.g. +2348012345678' })
    }

    const db = getServerClient()

    // Fallback lookup: If neither location_id nor lga_id is explicitly supplied, attempt lookup or auto-resolution
    if (!locationId && !lgaId) {
      const searchName = locationName || locationText
      if (searchName) {
        // 1. Try matching location by exact or partial name
        const { data: matchedLoc } = await db
          .from('locations')
          .select('id, lga_id')
          .ilike('name', `%${searchName}%`)
          .limit(1)
          .maybeSingle()

        if (matchedLoc) {
          locationId = matchedLoc.id
        } else {
          // 2. Try matching LGA by name
          const { data: matchedLga } = await db
            .from('lgas')
            .select('id')
            .ilike('name', `%${searchName}%`)
            .limit(1)
            .maybeSingle()

          if (matchedLga) {
            lgaId = matchedLga.id
          } else {
            // 3. Fallback: Auto-create a pending community location attached to the first available LGA
            const { data: anyLga } = await db.from('lgas').select('id').limit(1).maybeSingle()
            if (anyLga?.id) {
              const { data: createdLoc } = await db
                .from('locations')
                .insert({
                  lga_id: anyLga.id,
                  name: searchName.slice(0, 100),
                  source: 'community',
                  status: 'pending',
                })
                .select('id')
                .maybeSingle()

              if (createdLoc?.id) {
                locationId = createdLoc.id
              } else {
                lgaId = anyLga.id
              }
            }
          }
        }
      }
    }

    // Ensure we satisfy chk_subscription_target constraint: location_id OR lga_id (exclusive)
    if (locationId) {
      lgaId = null
    }

    if (!locationId && !lgaId) {
      return res.status(400).json({ error: 'A valid location or LGA selection is required.' })
    }

    // Rate limiting: Max 5 subscription/OTP requests per phone number per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count, error: countErr } = await db
      .from('sms_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('phone_number', phone)
      .gte('last_attempt_at', oneHourAgo)

    if (countErr && (countErr.message?.includes('sms_subscriptions') || countErr.code === 'PGRST200' || countErr.code === '42P01')) {
      return res.status(500).json({
        error: 'Database table "sms_subscriptions" is missing. Please run "supabase/010_sms_subscriptions.sql" in your Supabase SQL Editor.',
      })
    }

    if (!countErr && count >= 5) {
      return res.status(429).json({ error: 'Too many verification attempts for this phone number. Please try again in an hour.' })
    }

    const code = generateOtp()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes expiry
    const now = new Date().toISOString()

    // Check if an existing subscription exists for phone + target
    let existingQuery = db.from('sms_subscriptions').select('id, status').eq('phone_number', phone)
    if (locationId) {
      existingQuery = existingQuery.eq('location_id', locationId)
    } else {
      existingQuery = existingQuery.eq('lga_id', lgaId)
    }

    const { data: existingSub, error: subQueryErr } = await existingQuery.maybeSingle()
    if (subQueryErr && (subQueryErr.message?.includes('sms_subscriptions') || subQueryErr.code === 'PGRST200' || subQueryErr.code === '42P01')) {
      return res.status(500).json({
        error: 'Database table "sms_subscriptions" is missing. Please run "supabase/010_sms_subscriptions.sql" in your Supabase SQL Editor.',
      })
    }

    let subId = null

    if (existingSub) {
      const { data: updated, error: updateErr } = await db
        .from('sms_subscriptions')
        .update({
          status: 'pending',
          confirmation_code: code,
          confirmation_expires_at: expiresAt,
          last_attempt_at: now,
          attempts_count: 0,
          updated_at: now,
        })
        .eq('id', existingSub.id)
        .select('id')
        .single()

      if (updateErr) throw updateErr
      subId = updated.id
    } else {
      const { data: inserted, error: insertErr } = await db
        .from('sms_subscriptions')
        .insert({
          phone_number: phone,
          location_id: locationId,
          lga_id: lgaId,
          status: 'pending',
          confirmation_code: code,
          confirmation_expires_at: expiresAt,
          last_attempt_at: now,
          attempts_count: 0,
        })
        .select('id')
        .single()

      if (insertErr) throw insertErr
      subId = inserted.id
    }

    // Send confirmation OTP code via Twilio
    const smsRes = await sendSMS(
      phone,
      `SIGNAL: Your confirmation code is ${code}. Valid for 10 minutes.`
    )

    return res.status(200).json({
      subscription_id: subId,
      phone_number: phone,
      message: 'Verification code sent via SMS',
      sent: smsRes.sent,
    })
  } catch (error) {
    console.error('[SMS Subscribe Error]:', error)
    const errMsg = error.message || error.details || ''
    if (errMsg.includes('sms_subscriptions') || errMsg.includes('schema cache') || error.code === 'PGRST200' || error.code === '42P01') {
      return res.status(500).json({
        error: 'Database table "sms_subscriptions" is missing. Please run "supabase/010_sms_subscriptions.sql" in your Supabase SQL Editor.',
      })
    }
    return res.status(500).json({ error: errMsg || 'Failed to initiate SMS subscription' })
  }
}
