import { NextRequest } from "next/server";

const SURVEY_AGENTS_URL = process.env.SURVEY_AGENTS_URL || process.env.AGENTS_URL || "http://localhost:3040";

export async function POST(req: NextRequest) {
  let token = req.headers.get("authorization");
  
  if (!token) {
    const civicPartnerToken = req.cookies.get("civicPartnerToken")?.value;
    const adminToken = req.cookies.get("token")?.value;
    const rawToken = civicPartnerToken || adminToken;
    if (rawToken) {
      token = `Bearer ${rawToken}`;
    }
  }

  const requestId = Math.random().toString(36).slice(2, 8);
  console.log(`[proxy:${requestId}] survey-report/generate → ${SURVEY_AGENTS_URL}`);

  try {
    const body = await req.json().catch(() => ({}));

    if (!token) {
      console.warn(`[proxy:${requestId}] no Authorization header or cookie received from browser`);
      return new Response(JSON.stringify({ error: "Missing Authorization header or cookie. Please login and try again." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const upstream = await fetch(`${SURVEY_AGENTS_URL}/api/survey-report-generate/generate`, {
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
          console.log(`[proxy:${requestId}] chunk #${chunkCount}: ${value.length} bytes`);
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
