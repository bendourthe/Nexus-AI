/**
 * Image Studio sheet for a local splat beside one 2D message.
 * Generate stays disabled until a later phase wires the backend.
 */

import { useRef, useState } from "react";
import { GaussianSplatError, assertLocalSplatPath, decodeViewRequest, type GaussianCloud, type SplatFormat } from "../../../../core/image/GaussianSplat";
import { SPLAT_HONESTY_COPY, buildSplatProvenance, type SplatProvenance } from "../../../../core/image/SplatProvenance";
import { SplatViewerCanvas } from "./SplatViewerCanvas";

export interface LocalSplatFile {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly format: SplatFormat;
  readonly sourceImageHash?: string | null;
}

export type OpenLocalSplatResult = LocalSplatFile | { readonly error: string };

export type OpenLocalSplat = (messageId: string) => Promise<OpenLocalSplatResult>;

export interface SplatPreviewPanelProps {
  readonly sourceMessageId: string;
  readonly sourcePngName: string;
  readonly openLocalSplat?: OpenLocalSplat;
  readonly onClose: () => void;
  readonly onSaveSplat?: (fileName: string, bytes: Uint8Array) => void;
  readonly onSaveScreenshot?: (fileName: string, pngDataUrl: string) => void;
  readonly onGenerate?: () => Promise<{ ok: true; jobId: string } | { ok: false; message: string }>;
  readonly onCancelGenerate?: (jobId: string) => Promise<void>;
}

export function SplatPreviewPanel({
  sourceMessageId,
  sourcePngName,
  openLocalSplat,
  onClose,
  onSaveSplat,
  onSaveScreenshot,
  onGenerate,
  onCancelGenerate,
}: SplatPreviewPanelProps): JSX.Element {
  const [cloud, setCloud] = useState<GaussianCloud | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [provenance, setProvenance] = useState<SplatProvenance | null>(null);
  const [busy, setBusy] = useState(false);
  const [generateJobId, setGenerateJobId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function applyOpened(opened: OpenLocalSplatResult): Promise<void> {
    if ("error" in opened) {
      setCloud(null);
      setBytes(null);
      setProvenance(null);
      setNotice(opened.error);
      return;
    }
    assertLocalSplatPath(opened.path);
    const decoded = decodeViewRequest({
      id: sourceMessageId,
      source: { kind: "buffer", bytes: opened.bytes, format: opened.format },
    });
    setCloud(decoded);
    setBytes(opened.bytes);
    setProvenance(
      buildSplatProvenance({
        sourceImageHash: opened.sourceImageHash ?? null,
        format: opened.format,
        gaussianCount: decoded.count,
        createdAt: new Date().toISOString(),
        sourcePngName,
        requestId: sourceMessageId,
      }),
    );
  }

  async function openFile(): Promise<void> {
    if (!openLocalSplat) {
      fileRef.current?.click();
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await applyOpened(await openLocalSplat(sourceMessageId));
    } catch (error) {
      setCloud(null);
      setBytes(null);
      setProvenance(null);
      setNotice(
        error instanceof GaussianSplatError
          ? error.message
          : "Could not open that splat. The 2D image is unchanged. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function openPickedFile(file: File): Promise<void> {
    setBusy(true);
    setNotice(null);
    try {
      const format = assertLocalSplatPath(file.name);
      const picked = new Uint8Array(await file.arrayBuffer());
      await applyOpened({ path: file.name, bytes: picked, format });
    } catch (error) {
      setCloud(null);
      setBytes(null);
      setProvenance(null);
      setNotice(
        error instanceof GaussianSplatError
          ? error.message
          : "Could not open that splat. The 2D image is unchanged. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  function downloadSplat(): void {
    if (!bytes || !provenance?.splatFileName) return;
    onSaveSplat?.(provenance.splatFileName, bytes);
  }

  async function generate(): Promise<void> {
    if (!onGenerate) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await onGenerate();
      if (!result.ok) {
        setGenerateJobId(null);
        setNotice(result.message);
        return;
      }
      setGenerateJobId(result.jobId);
      setNotice(`Splat generate queued as ${result.jobId}.`);
    } catch (error) {
      setGenerateJobId(null);
      setNotice(error instanceof Error ? error.message : "Splat generate did not start.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      role="dialog"
      aria-labelledby={`splat-preview-title-${sourceMessageId}`}
      data-testid={`splat-preview-${sourceMessageId}`}
      data-splat-source={sourceMessageId}
    >
      <h2 id={`splat-preview-title-${sourceMessageId}`}>3D preview</h2>
      <p>{SPLAT_HONESTY_COPY}</p>
      <button type="button" onClick={() => void openFile()} disabled={busy}>
        Open local splat
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".splat,.ply"
        data-testid={`splat-file-${sourceMessageId}`}
        aria-label="Choose a local splat file"
        style={{ display: "none" }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void openPickedFile(file);
        }}
      />
      <button
        type="button"
        disabled={!onGenerate || busy}
        title={onGenerate ? "Queue a local splat generate job" : "generator not wired"}
        onClick={() => void generate()}
      >
        3D generate coming from local backend
      </button>
      {generateJobId ? (
        <button
          type="button"
          onClick={() => {
            const jobId = generateJobId;
            void onCancelGenerate?.(jobId).then(() => {
              setGenerateJobId(null);
              setNotice("Splat generate was cancelled.");
            });
          }}
        >
          Cancel splat generate
        </button>
      ) : null}
      <button type="button" onClick={onClose}>
        Close 3D preview
      </button>
      {notice ? (
        <p role="alert" data-testid={`splat-preview-notice-${sourceMessageId}`}>
          {notice}
        </p>
      ) : null}
      {cloud && provenance ? (
        <>
          <SplatViewerCanvas
            cloud={cloud}
            onScreenshot={(url) => {
              try {
                if (provenance.screenshotFileName === sourcePngName) return;
                onSaveScreenshot?.(provenance.screenshotFileName, url);
              } catch {
                setNotice("Screenshot failed. The splat file was not changed.");
              }
            }}
          />
          <button type="button" onClick={downloadSplat}>
            Download splat
          </button>
          <p data-testid={`splat-preview-file-${sourceMessageId}`}>{provenance.splatFileName}</p>
        </>
      ) : null}
    </section>
  );
}
