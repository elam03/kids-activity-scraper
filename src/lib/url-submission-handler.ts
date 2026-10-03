import { NextResponse } from 'next/server';
import { prisma } from './prisma';
import { validateWebUrl } from './web-scraper';
import { normalizeSubmissionUrl } from './url-submission-schema';
import { JevClient } from './jev';
import { processUrlSubmission } from './url-submission-processor';

export interface RouteHandlerOptions {
  db?: any;
  jevClient?: JevClient;
  processor?: typeof processUrlSubmission;
}

export async function handleGetSubmissions(
  request: Request,
  options: RouteHandlerOptions = {}
) {
  const db = options.db || prisma;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    const whereClause = status === 'all' ? {} : { status };

    const [submissions, total] = await Promise.all([
      db.urlSubmission.findMany({
        where: whereClause,
        include: {
          events: {
            select: {
              id: true,
              title: true,
              startDate: true,
              status: true,
              category: true,
              location: true,
            },
            orderBy: { startDate: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.urlSubmission.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json({
      submissions,
      total,
      limit,
      offset,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function handlePostSubmissions(
  request: Request,
  options: RouteHandlerOptions = {}
) {
  const db = options.db || prisma;
  const jev = options.jevClient || new JevClient();
  const processor = options.processor || processUrlSubmission;

  try {
    const body = await request.json().catch(() => ({}));
    const { url, notes, runImmediately } = body;

    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json(
        { error: 'A valid URL is required' },
        { status: 400 }
      );
    }

    const trimmedUrl = url.trim();

    // 1. SSRF and protocol check
    const validation = validateWebUrl(trimmedUrl);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid URL' },
        { status: 400 }
      );
    }

    const normalizedUrl = normalizeSubmissionUrl(trimmedUrl);

    // 2. Gate 1: URL Triage
    const triage = await jev.triageUrl(trimmedUrl, notes);
    if (!triage.isRelevant) {
      const rejectedSubmission = await db.urlSubmission.create({
        data: {
          rawUrl: trimmedUrl,
          normalizedUrl,
          notes: notes?.trim() || null,
          status: 'rejected',
          failureReason: triage.reason || 'Flagged by Gate 1 URL triage filter',
          processedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: false,
        submission: rejectedSubmission,
        message: `URL rejected by triage filter: ${triage.reason || 'Not relevant to family activities'}`,
      });
    }

    // 3. Create submission in queued status
    const submission = await db.urlSubmission.create({
      data: {
        rawUrl: trimmedUrl,
        normalizedUrl,
        notes: notes?.trim() || null,
        status: 'queued',
      },
    });

    // 4. Run immediately or leave in queue
    if (runImmediately) {
      const result = await processor(submission.id, {
        db,
        jevClient: jev,
      });

      const updated = await db.urlSubmission.findUnique({
        where: { id: submission.id },
        include: {
          events: {
            select: {
              id: true,
              title: true,
              startDate: true,
              status: true,
              category: true,
              location: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: result.status === 'completed',
        submission: updated,
        result,
      });
    }

    return NextResponse.json({
      success: true,
      submission,
      message: 'URL queued for background ingestion',
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function handleDeleteSubmission(
  request: Request,
  options: RouteHandlerOptions = {}
) {
  const db = options.db || prisma;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing submission ID' },
        { status: 400 }
      );
    }

    await db.urlSubmission.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
