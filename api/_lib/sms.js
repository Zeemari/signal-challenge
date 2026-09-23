import { sendSms, validateSendchampSignature } from './sendchamp.js'

export function normalizePhoneNumber(rawPhone) {
  if (typeof rawPhone !== 'string') return null
  let cleaned = rawPhone.trim().replace(/[\s\-\(\)]/g, '')
  if (!cleaned) return null

  // Nigerian phone number normalization convenience
  if (/^0[789][01]\d{8}$/.test(cleaned)) {
    cleaned = '+234' + cleaned.slice(1)
  } else if (/^234[789][01]\d{8}$/.test(cleaned)) {
    cleaned = '+' + cleaned
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned
  }

  // E.164 compliance standard regex check: + followed by 7 to 15 digits
  if (/^\+[1-9]\d{6,14}$/.test(cleaned)) {
    return cleaned
  }
  return null
}

export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Validates inbound webhook signature via Sendchamp.
 */
export function validateWebhookSignature(req) {
  return validateSendchampSignature(req)
}

// Deprecated fallback for backward compatibility with legacy Twilio webhooks
export function validateTwilioSignature() {
  return false
}

/**
 * Sends an SMS message using Sendchamp and never throws.
 * Contract: returns { sent: boolean, reason?: string, providerMessageId?: string }
 */
export async function sendSMS(to, body) {
  if (!to) return { sent: false, reason: 'no_recipient_number' }
  const res = await sendSms({ to, message: body })
  return {
    sent: res.success,
    reason: res.error,
    providerMessageId: res.providerMessageId,
  }
}

/**
 * Dispatches outbound SMS alerts for a signal transitioning to an elevated state
 * or triggered via the verified correspondent priority fast-path.
 * Obeys a 30-min cooldown window per subscriber.
 */
export async function dispatchSignalAlerts(db, signal, { previousStatus, isPriority = false, trustIndicator = null, category = '' } = {}) {
  if (!db || !signal) return

  const isTrustedContact = isPriority || trustIndicator === 'single_trusted_contact' || signal.source_trust_indicator === 'single_trusted_contact'
  const isElevated = isTrustedContact || signal.status === 'corroborating' || signal.review_status === 'verified'
  if (!isElevated) return

  const cooldownMinutes = parseInt(process.env.ALERT_COOLDOWN_MINUTES || '30', 10)
  const cooldownCutoff = new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString()

  try {
    // Determine location and LGA IDs associated with the signal if available
    let locationId = signal.location_id || null
    let lgaId = signal.lga_id || null

    if (!locationId && signal.location) {
      const { data: locMatch } = await db
        .from('locations')
        .select('id, lga_id')
        .ilike('name', signal.location)
        .maybeSingle()
      if (locMatch) {
        locationId = locMatch.id
        if (!lgaId) lgaId = locMatch.lga_id
      }
    }

    // Query active subscribers for matching location or LGA whose cooldown has expired
    let query = db
      .from('sms_subscriptions')
      .select('id, phone_number, last_alert_sent_at')
      .eq('status', 'active')

    if (locationId && lgaId) {
      query = query.or(`location_id.eq.${locationId},lga_id.eq.${lgaId}`)
    } else if (locationId) {
      query = query.eq('location_id', locationId)
    } else if (lgaId) {
      query = query.eq('lga_id', lgaId)
    } else {
      return // No specific location link to target
    }

    const { data: subscribers, error } = await query
    if (error || !subscribers?.length) return

    // Filter subscribers past the cooldown window
    const eligibleSubscribers = subscribers.filter((sub) => {
      if (!sub.last_alert_sent_at) return true
      return new Date(sub.last_alert_sent_at).getTime() < new Date(cooldownCutoff).getTime()
    })

    if (!eligibleSubscribers.length) return

    const locationName = signal.location || 'your area'
    const eventDetails = category || signal.category || (signal.summary ? signal.summary.slice(0, 50) : 'activity')

    let body = ''
    if (isTrustedContact) {
      body = `SIGNAL ALERT: A trusted local contact reports ${eventDetails} near ${locationName}. Not yet independently confirmed — exercise caution. Reply STOP to unsubscribe.`
    } else {
      body = `SIGNAL ALERT: Multiple reports confirm ${eventDetails} near ${locationName}. Avoid the area or take an alternate route. Reply STOP to unsubscribe.`
    }

    const now = new Date().toISOString()
    const sentIds = []

    // Batch send SMS alerts asynchronously
    const BATCH_SIZE = 25
    for (let i = 0; i < eligibleSubscribers.length; i += BATCH_SIZE) {
      const batch = eligibleSubscribers.slice(i, i + BATCH_SIZE)
      await Promise.allSettled(
        batch.map(async (sub) => {
          const res = await sendSMS(sub.phone_number, body)
          if (res.sent) {
            sentIds.push(sub.id)
          }
        })
      )
    }

    // Update last_alert_sent_at timestamp for subscribers that were successfully alerted
    if (sentIds.length > 0) {
      await db
        .from('sms_subscriptions')
        .update({ last_alert_sent_at: now })
        .in('id', sentIds)
    }
  } catch (err) {
    console.error('[SMS Alert Dispatcher Error]:', err.message)
  }
}
