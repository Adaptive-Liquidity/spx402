import { describe, expect, it } from "vitest";
import { BodyTooLargeError, readBodyWithLimit } from "@/lib/http/read-body.server";

function streamedRequest(chunks: string[], headers: HeadersInit = {}) {
  const encoder = new TextEncoder();
  return {
    headers: new Headers(headers),
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
  };
}

describe("readBodyWithLimit", () => {
  it("rejects a streamed body without Content-Length once the byte cap is exceeded", async () => {
    await expect(readBodyWithLimit(streamedRequest(["1234", "5678"]), 7)).rejects.toBeInstanceOf(
      BodyTooLargeError,
    );
  });

  it("counts encoded bytes rather than JavaScript characters", async () => {
    await expect(readBodyWithLimit(streamedRequest(["é", "é"]), 4)).resolves.toBe("éé");
    await expect(readBodyWithLimit(streamedRequest(["é", "é"]), 3)).rejects.toBeInstanceOf(
      BodyTooLargeError,
    );
  });

  it("rejects an oversized declared length before reading the stream", async () => {
    await expect(
      readBodyWithLimit(streamedRequest(["{}"], { "content-length": "100" }), 64),
    ).rejects.toBeInstanceOf(BodyTooLargeError);
  });
});
