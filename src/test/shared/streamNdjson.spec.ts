import { describe, it, expect, vi } from "vitest";
import { consumeNdjsonStream } from "@/lib/streamNdjson";

describe("consumeNdjsonStream", () => {
  it("parses newline-delimited JSON events", async () => {
    const lines = [
      JSON.stringify({ type: "progress", stage: "a", percent: 10 }),
      JSON.stringify({ type: "result", data: { ok: true } }),
    ].join("\n");
    const response = new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(lines));
        controller.close();
      },
    }), { headers: { "Content-Type": "application/x-ndjson" } });

    const events: unknown[] = [];
    await consumeNdjsonStream(response, (parsed) => events.push(parsed));
    expect(events).toHaveLength(2);
    expect((events[0] as { type: string }).type).toBe("progress");
    expect((events[1] as { type: string }).type).toBe("result");
  });
});
