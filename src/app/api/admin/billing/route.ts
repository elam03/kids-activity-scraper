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

    // 1. Fetch User Profile & Plan Info
    const resMe = await fetch(`https://api.apify.com/v2/users/me?token=${apiKey}`);
    if (!resMe.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch user profile from Apify' },
        { status: resMe.status }
      );
    }
    const payloadMe = await resMe.json();
    const dataMe = payloadMe.data || {};

    // 2. Fetch Actual Real-Time Monthly Billing Usage
    const resUsage = await fetch(`https://api.apify.com/v2/users/me/usage/monthly?token=${apiKey}`);
    let usageThisMonth = 0;
    let usageToday = 0;

    if (resUsage.ok) {
      const payloadUsage = await resUsage.json();
      const usageData = payloadUsage.data || {};
      usageThisMonth = usageData.totalUsageCreditsUsdAfterVolumeDiscount || 0;
      
      // Calculate today's usage from the daily breakdown if present
      const dailyBreakdown = usageData.dailyServiceUsages || [];
      if (dailyBreakdown.length > 0) {
        // Today's breakdown is usually the last item in the daily breakdown list
        const todayBreakdown = dailyBreakdown[dailyBreakdown.length - 1];
        usageToday = todayBreakdown?.totalUsageCreditsUsd || 0;
      }
    }

    return NextResponse.json({
      success: true,
      username: dataMe.username,
      email: dataMe.email,
      plan: dataMe.plan || { name: 'Free', monthlyPrepaidUsageUsd: 5.0 },
      currentBillingPeriod: dataMe.currentBillingPeriod || null,
      stats: {
        usageToday,
        usageThisMonth,
        limits: dataMe.limits || {}
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
