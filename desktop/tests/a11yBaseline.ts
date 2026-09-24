export interface A11yTriple {
  readonly route: string;
  readonly rule: string;
  readonly selector: string;
}

export function tripleKey(triple: A11yTriple): string {
  return `${triple.route}\t${triple.rule}\t${triple.selector}`;
}

/** New triples fail even when the observed count is lower than the baseline. */
export function unexpectedTriples(baseline: readonly A11yTriple[], observed: readonly A11yTriple[]): A11yTriple[] {
  const known = new Set(baseline.map(tripleKey));
  return observed.filter((triple) => !known.has(tripleKey(triple)));
}
