import { NextResponse } from 'next/server';
import { createSSEStream } from '@/lib/sse';

export async function GET() {
  const stream = createSSEStream();

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
