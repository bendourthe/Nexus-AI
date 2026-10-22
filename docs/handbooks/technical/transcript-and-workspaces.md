# Transcript and Agents Workspace

Chat usage is separated by message role. User bubbles show only the user message's input-token count. Assistant bubbles show visible reasoning plus visible answer tokens, while request and context input totals remain in Activity telemetry. Token provenance records whether counts are exact or estimated.

An empty pending response renders on the transcript canvas with a safe inset and no message bubble. A pending response that already has content retains its bubble. Completed metadata stays inside each bubble above content. Reasoning is collapsed above the answer by default, and ordinary message clicks do not open a duplicate preview panel.

Agents uses the installed recommendation snapshot before presenting a model selection. Workspace folders, Chat/Memory/Activity tabs, and collapsible session history share one main pane. The workspace scope authorizes the union of selected roots; operations outside every selected root remain denied.

Chat explorer folder colors are saved in the local chat database and survive application restart. Use a folder's context menu to change its color or clear it. A failed save shows an error and leaves the stored color unchanged. The shared explorer adapter refreshes from storage and discards tree responses that began before a successful mutation, so an older read cannot replace the current color. Folder colors do not change workspace permissions.
