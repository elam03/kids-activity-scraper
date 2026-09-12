import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ingestEvent } from '@/lib/event-ingestion';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'Missing imageBase64 parameter' }, { status: 400 });
    }

    // 1. Get or create the special source for manual uploads
    const manualSource = await prisma.source.upsert({
      where: { handle: 'manual_uploads' },
      update: {},
      create: {
        handle: 'manual_uploads',
        name: 'Manual Image Uploads',
        isActive: true,
      },
    });

    // 2. We construct a unique rawPostUrl for this file upload
    // using a timestamp hash to prevent compound key collision
    const uploadId = `upload_${Date.now()}`;
    const rawPostUrl = `https://manual-upload/${uploadId}`;

    // 3. Trigger event ingestion directly with the flyer image
    const result = await ingestEvent(manualSource.id, {
      postUrl: rawPostUrl,
      images: [imageBase64],
      caption: 'Manually uploaded flyer image.',
      isManual: true,
    });

    return NextResponse.json({
      success: true,
      events: result.events,
      confidence: result.confidence,
    });
  } catch (error) {
    console.error('Manual image upload parsing failed:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
