/** One holder at a time. A crashed holder expires instead of blocking compaction forever. */

export const COMPACTION_LEASE_TTL_MS = 30_000;

export class CompactionLease {
  private holder: { readonly id: string; readonly expiresAt: number } | null = null;

  constructor(
    private readonly now: () => number = () => Date.now(),
    private readonly ttlMs = COMPACTION_LEASE_TTL_MS,
  ) {}

  tryAcquire(id: string): { readonly ok: true } | { readonly ok: false; readonly reason: string } {
    this.expire();
    if (this.holder && this.holder.id !== id) {
      return { ok: false, reason: `compaction lease held by ${this.holder.id}` };
    }
    this.holder = { id, expiresAt: this.now() + this.ttlMs };
    return { ok: true };
  }

  release(id: string): void {
    if (this.holder?.id === id) this.holder = null;
  }

  private expire(): void {
    if (this.holder && this.holder.expiresAt <= this.now()) this.holder = null;
  }
}

export const sharedCompactionLease = new CompactionLease();
