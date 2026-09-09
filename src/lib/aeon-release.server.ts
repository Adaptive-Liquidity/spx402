// Honest AEON release facts. Never claims mainnet. The documented program ID
// is the live v0.2 *devnet* deployment from Adaptive-Liquidity/aeon-program.
//
// Server-only: reads process.env. Client surfaces reach this through
// aeon-release.functions.ts (createServerFn) or GET /api/aeon/release-status.

import { AEON_PROGRAM_ID_DEVNET, resolveAeonProgramId } from "@/lib/trust/config";

export interface AeonReleaseStatus {
  release_status: "devnet";
  mainnet_status: "not_deployed";
  program_address: string;
  pipeline_enabled: boolean;
  decoder: "idl-v0.2";
  grading: "enabled" | "withheld";
  attestations: "gated_on_grade_change" | "disabled";
}

export function getAeonReleaseStatus(
  env: {
    NODE_ENV?: string;
    AEON_PROGRAM_ID?: string;
    AEON_ALLOW_DEVNET?: string;
  } = process.env,
): AeonReleaseStatus {
  let pipelineEnabled = false;
  try {
    pipelineEnabled = resolveAeonProgramId(env).enabled;
  } catch {
    pipelineEnabled = false;
  }
  return {
    release_status: "devnet",
    mainnet_status: "not_deployed",
    program_address: AEON_PROGRAM_ID_DEVNET,
    pipeline_enabled: pipelineEnabled,
    decoder: "idl-v0.2",
    grading: pipelineEnabled ? "enabled" : "withheld",
    attestations: pipelineEnabled ? "gated_on_grade_change" : "disabled",
  };
}
