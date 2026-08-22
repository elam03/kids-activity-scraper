import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const apiKey = process.env.APIFY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing APIFY_API_KEY environment variable' },
        { status: 400 }
      );
    }

    // Call Apify get user info endpoint
    const res = await fetch(`https://api.apify.com/v2/users/me?token=${apiKey}`);
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch user data from Apify' },
        { status: res.status }
      );
    }

    const payload = await res.json();
    const data = payload.data || {};

    return NextResponse.json({
      success: true,
      username: data.username,
      email: data.email,
      plan: data.plan || { name: 'Free' },
      currentBillingPeriod: data.currentBillingPeriod || null,
      stats: {
        usageToday: data.stats?.usageToday || 0,
        usageThisMonth: data.stats?.usageThisMonth || 0,
        limits: data.limits || {}
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
