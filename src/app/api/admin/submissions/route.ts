import {
  handleGetSubmissions,
  handlePostSubmissions,
  handleDeleteSubmission,
} from '@/lib/url-submission-handler';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handleGetSubmissions(request);
}

export async function POST(request: Request) {
  return handlePostSubmissions(request);
}

export async function DELETE(request: Request) {
  return handleDeleteSubmission(request);
}
