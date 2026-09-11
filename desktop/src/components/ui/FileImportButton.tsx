/**
 * v2.4.9 -- a styled "pick a file" button.
 *
 * A bare `<input type="file">` is unstyleable and, by repo convention
 * (`settings-control-sweep`), must not appear in a Settings body. This keeps
 * the native input hidden and driven by a real `Button`, so callers get one
 * styled control and the file dialog still comes from a genuine user gesture,
 * which is the only way a browser will open it.
 */

import { useRef, type ReactNode } from "react";
import { Button } from "./Button";

export interface FileImportButtonProps {
  /** e.g. ".md,.markdown,text/markdown". */
  readonly accept?: string;
  readonly testId?: string;
  readonly disabled?: boolean;
  readonly children: ReactNode;
  onFile(file: File): void;
}

export function FileImportButton({
  accept,
  testId,
  disabled = false,
  children,
  onFile,
}: FileImportButtonProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        {...(testId ? { testId } : {})}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {children}
      </Button>
      <input
        ref={inputRef}
        type="file"
        {...(accept ? { accept } : {})}
        data-testid={testId ? `${testId}-input` : undefined}
        style={{ display: "none" }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          // Reset so picking the SAME file twice still fires a change event.
          event.target.value = "";
        }}
      />
    </>
  );
}
