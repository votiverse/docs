/**
 * Seed manifest reader — loads key→UUID mappings from the VCP seed manifest.
 *
 * The VCP seed writes `platform/vcp/seed-manifest.json` after seeding.
 * Screenshot scripts and other tooling use this module to resolve entity IDs
 * by their semantic keys (e.g., "municipal-emergency") instead of hardcoding UUIDs.
 *
 * Usage:
 *   const m = loadManifest();
 *   const assemblyId = m.assembly("municipal");
 *   const eventId = m.event("municipal-emergency");
 *   const issueId = m.issue("municipal-emergency", 0);
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

/** Shape of seed-manifest.json written by the VCP seed script. */
interface SeedManifest {
  generatedAt: string;
  assemblies: Record<string, string>;
  participants: Record<string, string>;
  topics: Record<string, string>;
  events: Record<string, { eventId: string; issueIds: string[] }>;
}

/** Typed accessor returned by loadManifest(). */
export interface ManifestAccessor {
  /** Raw manifest data. */
  raw: SeedManifest;

  /** Resolve an assembly key to its UUID. */
  assembly(key: string): string;

  /** Resolve a participant by assembly key and name. */
  participant(assemblyKey: string, name: string): string;

  /** Resolve a topic by assembly key and topic key. */
  topic(assemblyKey: string, topicKey: string): string;

  /** Resolve an event key to its event UUID. */
  event(eventKey: string): string;

  /** Resolve an issue by event key and issue index. */
  issue(eventKey: string, issueIndex: number): string;
}

/**
 * Load the seed manifest from the VCP directory.
 *
 * Looks for `seed-manifest.json` by walking up from the docs repo
 * to find the sibling votiverse repo. Customize the path by passing
 * an explicit path or setting the SEED_MANIFEST_PATH env var.
 */
export function loadManifest(manifestPath?: string): ManifestAccessor {
  const path = manifestPath
    ?? process.env["SEED_MANIFEST_PATH"]
    ?? findManifest();

  if (!existsSync(path)) {
    throw new Error(
      `Seed manifest not found at ${path}.\n` +
      `Run 'cd platform/vcp && pnpm reset' in the votiverse repo to generate it.`,
    );
  }

  const raw: SeedManifest = JSON.parse(readFileSync(path, "utf-8"));

  return {
    raw,

    assembly(key: string): string {
      const id = raw.assemblies[key];
      if (!id) throw new Error(`Assembly key "${key}" not found in manifest`);
      return id;
    },

    participant(assemblyKey: string, name: string): string {
      const id = raw.participants[`${assemblyKey}::${name}`];
      if (!id) throw new Error(`Participant "${name}" in "${assemblyKey}" not found in manifest`);
      return id;
    },

    topic(assemblyKey: string, topicKey: string): string {
      const id = raw.topics[`${assemblyKey}::${topicKey}`];
      if (!id) throw new Error(`Topic "${topicKey}" in "${assemblyKey}" not found in manifest`);
      return id;
    },

    event(eventKey: string): string {
      const entry = raw.events[eventKey];
      if (!entry) throw new Error(`Event key "${eventKey}" not found in manifest`);
      return entry.eventId;
    },

    issue(eventKey: string, issueIndex: number): string {
      const entry = raw.events[eventKey];
      if (!entry) throw new Error(`Event key "${eventKey}" not found in manifest`);
      const id = entry.issueIds[issueIndex];
      if (!id) throw new Error(`Issue index ${issueIndex} not found for event "${eventKey}"`);
      return id;
    },
  };
}

/**
 * Walk up from this file to find the votiverse repo's seed manifest.
 * Assumes standard workspace layout: docs/ and votiverse/ are siblings.
 */
function findManifest(): string {
  // Try common layouts:
  // 1. docs/ and votiverse/ are siblings under a common parent
  // 2. docs/ is inside votiverse/
  const candidates = [
    resolve(import.meta.dirname ?? ".", "..", "..", "votiverse", "platform", "vcp", "seed-manifest.json"),
    resolve(import.meta.dirname ?? ".", "..", "platform", "vcp", "seed-manifest.json"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  // Default to the most common layout
  return candidates[0]!;
}
