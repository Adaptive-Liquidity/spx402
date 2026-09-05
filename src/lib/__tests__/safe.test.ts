import { describe, expect, it } from "vitest";
import { safe } from "@/lib/safe";

describe("safe() loader fallback", () => {
  it("returns the resolved value on success", async () => {
    await expect(safe(Promise.resolve(42), 0)).resolves.toBe(42);
  });

  it("returns the fallback when the promise rejects", async () => {
    await expect(safe(Promise.reject(new Error("upstream down")), [] as number[])).resolves.toEqual(
      [],
    );
  });

  it("returns the fallback for a synchronously throwing async fn", async () => {
    const boom = async (): Promise<string> => {
      throw new Error("PostgREST 500");
    };
    await expect(safe(boom(), "degraded")).resolves.toBe("degraded");
  });
});
