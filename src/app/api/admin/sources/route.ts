import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/admin/sources
export async function GET() {
  try {
    const sources = await prisma.source.findMany({
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

    if (!handle || !name) {
      return NextResponse.json(
        { error: 'Missing handle or name parameters' },
        { status: 400 }
      );
    }

    const cleanHandle = handle.replace(/@/g, '').trim();

    const source = await prisma.source.upsert({
      where: { handle: cleanHandle },
      update: { name },
      create: { handle: cleanHandle, name },
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
