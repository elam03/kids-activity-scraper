import { NextResponse } from 'next/server';
import { recordTelemetryEvent, type TelemetryEvent } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    let payload: Partial<TelemetryEvent> = {};

    // sendBeacon may send as text/plain or application/json
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      payload = await request.json().catch(() => ({}));
    } else {
      const rawText = await request.text().catch(() => '');
      if (rawText) {
        try {
          payload = JSON.parse(rawText);
        } catch {
          payload = {};
        }
      }
    }

    if (!payload.eventName || typeof payload.eventName !== 'string') {
      return NextResponse.json({ ok: false, error: 'Missing eventName' }, { status: 400 });
    }

    recordTelemetryEvent({
      eventName: payload.eventName,
      params: payload.params || {},
      timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : Date.now(),
      path: payload.path,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
