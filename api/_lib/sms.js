import Twilio from 'twilio'

// Lazy, same reasoning as api/_lib/anthropic.js: don't construct the client
// (and don't read env vars) at module import time, since import order can
// run this before .env has been loaded into process.env.
let client = null
let warnedMissingConfig = false

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !authToken) return null
  if (!client) client = Twilio(sid, authToken)
  return client
}

// Sends an SMS and never throws — a failed or unconfigured SMS send should
// never break report submission. Callers get a { sent, reason } result they
// can log, but don't need to handle as an error.
export async function sendSMS(to, body) {
  const from = process.env.TWILIO_FROM_NUMBER
  const twilioClient = getClient()

  if (!twilioClient || !from) {
    if (!warnedMissingConfig) {
      console.warn(
        '[SMS] Not configured — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER to enable danger alerts.'
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
