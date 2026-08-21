/** Signals that a request body exceeded its configured byte limit. */
export class BodyTooLargeError extends Error {
  constructor() {
    super("payload_too_large");
    this.name = "BodyTooLargeError";
  }
}

interface ReadableRequestBody {
  headers: Headers;
  body: ReadableStream<Uint8Array> | null;
}

/** Read a request body while enforcing the byte cap during streaming. */
export async function readBodyWithLimit(
  request: ReadableRequestBody,
  maxBytes: number,
): Promise<string> {
  const declaredLength = request.headers.get("content-length");
  if (
    declaredLength !== null &&
    Number.isFinite(Number(declaredLength)) &&
    Number(declaredLength) > maxBytes
  ) {
    throw new BodyTooLargeError();
  }

  const reader = request.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}
