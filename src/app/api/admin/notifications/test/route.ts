import { NextResponse } from 'next/server';
import { dispatchAlert, type AlertPayload } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const channel = body.channel || 'both'; // 'discord' | 'email' | 'both'

    const testPayload: AlertPayload = {
      title: '🧪 Test Kids Calendar Alert',
      message: 'This is a test notification confirming your Discord webhook and Email alert pipeline are working properly.',
      priority: channel === 'discord' ? 'routine' : 'high',
      fields: [
        { name: 'Environment', value: process.env.NODE_ENV || 'development', inline: true },
        { name: 'Timestamp', value: new Date().toLocaleTimeString(), inline: true },
        { name: 'Configured Channels', value: `${process.env.DISCORD_WEBHOOK_URL ? '✅ Discord' : '❌ Discord'} | ${process.env.RESEND_API_KEY ? '✅ Email' : '❌ Email'}`, inline: false },
      ],
      actionUrl: `${(process.env.APP_URL || 'https://www.littledaysout.com').replace(/\/$/, '')}/admin`,
      actionLabel: 'Open Admin Dashboard',
    };

    const result = await dispatchAlert(testPayload);

    return NextResponse.json({
      success: true,
      result,
      configured: {
        hasDiscordWebhook: Boolean(process.env.DISCORD_WEBHOOK_URL),
        hasResendApiKey: Boolean(process.env.RESEND_API_KEY),
        alertEmailRecipient: process.env.ALERT_EMAIL_RECIPIENT || null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
