import { NextRequest } from "next/server";

const AGENTS_URL = process.env.AGENTS_URL || "http://localhost:3040";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization");
  const requestId = Math.random().toString(36).slice(2, 8);
  console.log(`[proxy:${requestId}] report/generate → ${AGENTS_URL}`);

  try {
    const body = await req.json().catch(() => ({}));

    if (!token) {
      console.warn(`[proxy:${requestId}] no Authorization header received from browser`);
      return new Response(JSON.stringify({ error: "Missing Authorization header. Please login and try again." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const upstream = await fetch(`${AGENTS_URL}/api/report/generate`, {
      method: "POST",
      headers: {
        Authorization: token || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log(`[proxy:${requestId}] upstream status: ${upstream.status}`);

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => "unknown");
      console.error(`[proxy:${requestId}] upstream error: ${upstream.status} -${errText}`);
      return new Response(JSON.stringify({ error: `Upstream ${upstream.status}: ${errText}` }), {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Use an explicit TransformStream to pump chunks one-by-one.
    // Returning new Response(upstream.body) can buffer silently in some Next.js versions.
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();
    let chunkCount = 0;

    void (async () => {
      const reader = upstream.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log(`[proxy:${requestId}] stream done -${chunkCount} chunks forwarded`);
            break;
          }
          chunkCount++;
          console.log(`[proxy:${requestId}] chunk #${chunkCount}: ${value.length} bytes -${new TextDecoder().decode(value).slice(0, 80).replace(/\n/g, "\\n")}`);
          await writer.write(value);
        }
      } catch (e) {
        console.error(`[proxy:${requestId}] stream read error:`, e);
      } finally {
        await writer.close().catch(() => {});
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[proxy:${requestId}] fetch error:`, message);
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
