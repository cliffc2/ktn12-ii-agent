import { subscribe } from "@/lib/agent/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const encoder = new TextEncoder();

    let unsubscribe: (() => void) | null = null;

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(": heartbeat\n\n"));

        unsubscribe = subscribe((event) => {
          try {
            const data = JSON.stringify(event);
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          } catch {
            /* stream may already be closed */
          }
        });
      },
      cancel() {
        unsubscribe?.();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e: unknown) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
