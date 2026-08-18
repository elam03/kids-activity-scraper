import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/admin/sources
export async function GET() {
  try {
    const sources = await prisma.source.findMany({
      include: {
        events: {
          select: {
            id: true,
            title: true,
            rawPostUrl: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { handle: 'asc' },
    });
    return NextResponse.json({ sources });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/admin/sources
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { handle, name } = body;

    if (!handle) {
      return NextResponse.json(
        { error: 'Missing handle parameter' },
        { status: 400 }
      );
    }

    const cleanHandle = handle.replace(/@/g, '').trim();
    const finalName = name && name.trim() !== '' ? name.trim() : cleanHandle;

    const source = await prisma.source.upsert({
      where: { handle: cleanHandle },
      update: { name: finalName },
      create: { handle: cleanHandle, name: finalName },
    });

    return NextResponse.json({ source });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT /api/admin/sources
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, customIntervalHours } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const source = await prisma.source.update({
      where: { id },
      data: {
        customIntervalHours: customIntervalHours === undefined || customIntervalHours === 'auto' ? null : Number(customIntervalHours)
      }
    });

    return NextResponse.json({ source });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/sources
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing id parameter' },
        { status: 400 }
      );
    }

    await prisma.source.delete({
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
