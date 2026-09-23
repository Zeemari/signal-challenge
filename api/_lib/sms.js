import Twilio from 'twilio'

let client = null
let warnedMissingConfig = false

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !authToken) return null
  if (!client) client = Twilio(sid, authToken)
  return client
}

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

// Twilio Verify sends and checks the OTP itself using its own pre-approved
// templates, which trial accounts are allowed to use (unlike a raw custom-text
// SMS via messages.create, which trial accounts reject). This only covers the
// sign-up confirmation code — dispatchSignalAlerts below still needs a paid
// account since it sends free-form alert text.
export async function sendVerificationCode(to) {
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID
  const twilioClient = getClient()

  if (!twilioClient || !serviceSid) {
    if (!warnedMissingConfig) {
      console.warn('[SMS Verify] Not configured — set TWILIO_VERIFY_SERVICE_SID to enable OTP delivery.')
      warnedMissingConfig = true
    }
    return { sent: false, reason: 'not_configured' }
  }

  try {
    const verification = await twilioClient.verify.v2.services(serviceSid).verifications.create({ to, channel: 'sms' })
    return { sent: true, status: verification.status }
  } catch (error) {
    console.error(`[SMS Verify] Failed to send to ${to}:`, error.message)
    return { sent: false, reason: error.message }
  }
}

export async function checkVerificationCode(to, code) {
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID
  const twilioClient = getClient()

  if (!twilioClient || !serviceSid) {
    return { approved: false, reason: 'not_configured' }
  }

  try {
    const check = await twilioClient.verify.v2.services(serviceSid).verificationChecks.create({ to, code })
    return { approved: check.status === 'approved', status: check.status }
  } catch (error) {
    // Twilio throws (rather than returning a status) for things like an
    // already-used or unknown code — treat that as "not approved" instead of
    // a 500, since it's an expected user-facing outcome, not a server error.
    return { approved: false, reason: error.message }
  }
}

export function validateTwilioSignature(req, body = {}) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) return false
  const signature = req.headers?.['x-twilio-signature']
  if (!signature) return false

  const host = req.headers?.host || 'localhost'
  const proto = req.headers?.['x-forwarded-proto'] || 'http'
  const url = `${proto}://${host}${req.url}`

  try {
    return Twilio.validateRequest(authToken, signature, url, body)
  } catch (err) {
    console.error('[SMS Webhook] Signature validation error:', err.message)
    return false
  }
}

// Sends an SMS and never throws
export async function sendSMS(to, body) {
  const from = process.env.TWILIO_FROM_NUMBER
  const twilioClient = getClient()

  if (!twilioClient || !from) {
    if (!warnedMissingConfig) {
      console.warn(
        '[SMS] Not configured — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER to enable alerts.'
      )
      warnedMissingConfig = true
    }
    return { sent: false, reason: 'not_configured' }
  }

  if (!to) return { sent: false, reason: 'no_recipient_number' }

  try {
    await twilioClient.messages.create({ to, from, body })
    return { sent: true }
  } catch (error) {
    console.error(`[SMS] Failed to send to ${to}:`, error.message)
    return { sent: false, reason: error.message }
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

