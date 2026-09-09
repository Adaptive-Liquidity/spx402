export const PUBLICATION_UNPUBLISHED = "unpublished";
export const PUBLICATION_PUBLISHED = "published";

export type AgentPublicationStatus = "unpublished" | "published";

/**
 * Missing/null is treated as published so pre-migration rows stay listed.
 * Only an explicit unpublished value is hidden from public surfaces.
 */
export function isPubliclyListed(status: string | null | undefined): boolean {
  return status !== PUBLICATION_UNPUBLISHED;
}
