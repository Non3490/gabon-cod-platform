import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { Twilio } from 'twilio'

const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

/**
 * GET /api/twilio/token
 * Generate agent access token for Twilio Device
 * CALL_CENTER + ADMIN only
 */
export async function GET(request: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== 'CALL_CENTER' && user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const token = new twilioClient.jwt.AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { identity: user.id }
    )

    token.addGrant(
      new twilioClient.jwt.AccessToken.VoiceGrant({
        outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
        incomingAllow: true
      })
    )

    return NextResponse.json({ token: token.toJwt() })
  } catch (error) {
    console.error('Failed to generate Twilio token:', error)
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
  }
}
