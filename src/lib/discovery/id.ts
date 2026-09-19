/**
 * Monotonic candidate ID generator. Guards against cross-lane ID collisions
 * that the previous Date.now()-only scheme allowed within the same millisecond.
 */

let counter = 0;

export function createCandidateId(lane: 'structured' | 'unstructured'): string {
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER;
  const laneSuffix = lane === 'structured' ? 'a' : 'b';
  return `cand-${Date.now()}-${laneSuffix}-${counter}`;
}