export type Role = "user" | "assistant" | "system";

export interface Message {
  readonly id: string;
  readonly role: Role;
  readonly content: string;
  readonly timestamp: number;
  /**
   * v1.5.0 Phase 5 (item 33) -- optional base64-encoded image attachments on a
   * user turn. Forwarded to the model only when the active model is
   * vision-capable (see `toLlmMessages` / `isVisionCapableModel`). Ephemeral to
   * the live turn; not persisted to the chat-history store.
   */
  readonly images?: readonly string[];
}

export interface ConversationSession {
  readonly id: string;
  readonly title: string;
  readonly messages: readonly Message[];
  readonly createdAt: number;
  readonly updatedAt: number;
  /** Session this one was branched from. Null on a root thread. */
  readonly forkedFromSessionId?: string | null;
  /** Message in the parent session that this branch split from. */
  readonly forkedFromMessageId?: string | null;
  /** The continuation currently open for this family. Stored on the root row. */
  readonly activeLeafSessionId?: string | null;
  /** True when the parent id is set and that session row is gone. */
  readonly parentUnresolved?: boolean;
}
