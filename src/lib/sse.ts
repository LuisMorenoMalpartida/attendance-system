// Simple in-memory SSE pub/sub for development and small deployments.
// NOTE: serverless environments may not keep long-lived connections.

const subscribers: Array<(payload: string) => void> = [];

export function publishEvent(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const fn of subscribers) {
    try {
      fn(payload);
    } catch (e) {
      // ignore per-subscriber errors
    }
  }
}

export function createSSEStream() {
  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // sender for this client
      const send = (payload: string) => controller.enqueue(encoder.encode(payload));

      subscribers.push(send);

      // initial comment to establish connection
      controller.enqueue(encoder.encode(': connected\n\n'));

      // heartbeat to keep connection alive
      const id = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {}
      }, 25000);

      return () => {
        clearInterval(id);
        const idx = subscribers.indexOf(send);
        if (idx >= 0) subscribers.splice(idx, 1);
      };
    }
  });
}
