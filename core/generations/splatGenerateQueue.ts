/**
 * Child splat jobs on the existing generation queue.
 * Distinct ids and output ids keep two requests for one source apart.
 */

import { SPLAT_GENERATE_JOB_TYPE, parseSplatGenerateParameters } from "../image/SplatGenerate.js";
import type { GenerationJob, GenerationJobPriority, GenerationQueue } from "./GenerationQueue.js";

export function enqueueSplatGenerate(
  queue: GenerationQueue,
  input: {
    readonly id: string;
    readonly parentId: string;
    readonly parameters: Record<string, unknown>;
    readonly priority?: GenerationJobPriority;
  },
): GenerationJob {
  const parsed = parseSplatGenerateParameters(input.parameters);
  if (!parsed.ok) {
    throw new Error(`${parsed.code}: ${parsed.message}`);
  }
  if (input.id === input.parentId) {
    throw new Error("malformed: A splat job cannot reuse the source job id.");
  }
  return queue.enqueue({
    id: input.id,
    parentId: input.parentId,
    pillar: "image",
    jobType: SPLAT_GENERATE_JOB_TYPE,
    parameters: { ...parsed.value },
    priority: input.priority ?? "interactive",
  });
}

export function cancelSplatGenerate(
  queue: GenerationQueue,
  id: string,
): { readonly disposition: "queued" | "running" | "terminal"; readonly job: GenerationJob | null } {
  const current = queue.get(id);
  if (!current || current.jobType !== SPLAT_GENERATE_JOB_TYPE) {
    return { disposition: "terminal", job: current };
  }
  const disposition = current.state === "queued" ? "queued" : current.state === "running" ? "running" : "terminal";
  if (disposition === "terminal") return { disposition, job: current };
  return { disposition, job: queue.cancel(id) };
}
