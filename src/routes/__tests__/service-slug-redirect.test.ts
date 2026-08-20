// Route-level tests for the /service/$slug permalink contract:
// a UUID must redirect (once, replacing history) to the frozen canonical slug,
// an unknown UUID must 404, and a slug must load the transcript directly.

import { beforeEach, describe, expect, it, vi } from "vitest";

const service = {
  id: "11111111-2222-4333-8444-555555555555",
  slug: "example-com",
  url: "https://example.com/paid",
  chain: "solana" as const,
  payTo: "PayeeWalletAddress1111111111111111111111111",
  facilitator: "payai",
  probeTier: "A",
  advertisedAmountUsd: 0.001,
  discoveredVia: "settlement",
  lastProbeAt: null,
};

const fetchServiceById = vi.fn();
const fetchServiceBySlug = vi.fn();
const fetchProbeRuns = vi.fn();
const fetchAgentSubjectForPayee = vi.fn();
const getProberPublicConfig = vi.fn();

vi.mock("@/lib/prober-data", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/prober-data")>("@/lib/prober-data");
  return {
    ...actual,
    fetchServiceById: (...a: unknown[]) => fetchServiceById(...a),
    fetchServiceBySlug: (...a: unknown[]) => fetchServiceBySlug(...a),
    fetchProbeRuns: (...a: unknown[]) => fetchProbeRuns(...a),
    fetchAgentSubjectForPayee: (...a: unknown[]) => fetchAgentSubjectForPayee(...a),
  };
});

vi.mock("@/lib/system.functions", () => ({
  getProberPublicConfig: () => getProberPublicConfig(),
}));

async function runLoader(slug: string) {
  const { Route } = await import("../service.$slug");
  const loader = Route.options.loader as (ctx: {
    params: { slug: string };
  }) => Promise<unknown>;
  return loader({ params: { slug } });
}

describe("/service/$slug permalink resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchProbeRuns.mockResolvedValue([]);
    fetchAgentSubjectForPayee.mockResolvedValue(null);
    getProberPublicConfig.mockResolvedValue({
      enabled: false,
      hasSolanaKey: false,
      hasBaseKey: false,
      solanaWallet: null,
      baseWallet: null,
    });
  });

  it("redirects a UUID permalink to the canonical slug", async () => {
    fetchServiceById.mockResolvedValue(service);

    const thrown = await runLoader(service.id).then(
      () => null,
      (e: unknown) => e,
    );

    expect(thrown).toBeTruthy();
    const redirect = thrown as {
      to?: string;
      params?: { slug: string };
      replace?: boolean;
      isRedirect?: boolean;
    };
    expect(redirect.to).toBe("/service/$slug");
    expect(redirect.params).toEqual({ slug: service.slug });
    expect(redirect.replace).toBe(true);
    expect(fetchServiceById).toHaveBeenCalledWith(service.id);
    // A UUID must never be resolved as a slug.
    expect(fetchServiceBySlug).not.toHaveBeenCalled();
  });

  it("404s an unknown UUID instead of redirecting", async () => {
    fetchServiceById.mockResolvedValue(null);

    const thrown = await runLoader("99999999-8888-4777-8666-555555555555").then(
      () => null,
      (e: unknown) => e,
    );

    expect(thrown).toBeTruthy();
    expect((thrown as { to?: string }).to).toBeUndefined();
    expect(JSON.stringify(thrown)).toContain("notFound");
  });

  it("loads the transcript directly for a canonical slug (no redirect)", async () => {
    fetchServiceBySlug.mockResolvedValue(service);

    const data = (await runLoader(service.slug)) as { service: typeof service };

    expect(data.service.slug).toBe(service.slug);
    expect(fetchServiceById).not.toHaveBeenCalled();
  });
});
