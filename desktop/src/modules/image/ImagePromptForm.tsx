/**
 * v1.0.0 Phase 6.5 -- forms-driven prompt sidebar.
 * v1.1.0 Phase 12.7 -- Fast Preview toggle, multi-lang prompt hint,
 * Flow-DPM-Solver sampler, and 2K/4K resolutions gated by DiffusionTier.
 * v2.4.8 follow-up (2026-09-08) -- laid out on the shared studio settings
 * grammar (`StudioSettings.tsx`): one scrolling card, titled sections, a
 * responsive field grid, and no nested collapse hiding LoRAs / ControlNet /
 * VRAM behind a second button. Same fields, same rules, same test ids.
 *
 * Houses every parameter the user can tune: prompt + negative, model,
 * width / height, steps, CFG, sampler, seed, plus the collapsible
 * "Advanced" panel for LoRAs and ControlNet. Keeps its own controlled
 * state so the page only sees the final `PromptFormValues` snapshot
 * when the user clicks Generate.
 */

import { useMemo, useState } from "react";
import { Button, Select, Switch, TextField } from "../../components/ui";
import {
  StudioSettingsField,
  StudioSettingsPanel,
  StudioSettingsSection,
} from "../../shared/studio/StudioSettings";
import {
  capabilityNote,
  imageCapabilitiesFor,
} from "../../shared/studio/modelCapabilities";
import type { ControlNetRef, LoraRef } from "./diffusionClient";
import { foldModelId } from "../../../../core/registry/modelAliases";
import type { DiffusionTierId } from "../../../../core/config/DiffusionTier";
import { defaultMemoryBudget, validateMemoryBudget } from "../../../../core/config/diffusionBudget";

export interface PromptFormValues {
  readonly prompt: string;
  readonly negativePrompt: string;
  readonly modelId: string;
  readonly width: number;
  readonly height: number;
  readonly steps: number;
  readonly cfgScale: number;
  readonly sampler: string;
  readonly seed: number;
  readonly fastPreview: boolean;
  readonly loras: readonly LoraRef[];
  readonly controlNet?: ControlNetRef;
  readonly maxCacheVramGB: number;
  readonly maxCacheRamGB: number;
  readonly workingMemReserveGB: number;
  readonly layerStreaming: boolean;
}

export interface ImagePromptFormProps {
  readonly initial?: Partial<PromptFormValues>;
  readonly availableModels: readonly { id: string; displayName: string }[];
  readonly availableLoras: readonly { id: string; displayName: string }[];
  readonly availableControlNets: readonly { id: string; displayName: string }[];
  readonly disabled?: boolean;
  readonly onChange?: (values: PromptFormValues) => void;
  /**
   * Diffusion tier resolved at the page level (Phase 3). Controls which
   * resolutions appear in the dropdown: 2K is gated to `diffusion-mid+`,
   * 4K to `diffusion-high+`. Default `diffusion-low` so callers in tests
   * that omit the prop still get the conservative tier.
   */
  readonly diffusionTier?: DiffusionTierId;
  /**
   * Model id used when "Fast Preview" is toggled on. Phase 12.7 maps
   * this to `sana-sprint-1024` by default; the page-level orchestrator
   * forwards the form's `fastPreview` flag plus this id into the
   * dispatch request when Generate fires.
   */
  readonly fastPreviewModelId?: string;
}

const SAMPLERS = [
  "euler",
  "euler_a",
  "dpmpp_2m",
  "dpmpp_sde",
  "ddim",
  "lms",
  // v1.1.0 Phase 12.7 -- SANA family's Flow-DPM-Solver scheduler.
  "flow-dpm-solver",
];

export const FAST_PREVIEW_MODEL_ID = "sana-sprint-1024";

interface ResolutionOption {
  readonly value: string;
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly requires?: DiffusionTierId;
}

const RESOLUTION_OPTIONS: readonly ResolutionOption[] = [
  { value: "512x512", label: "512 x 512", width: 512, height: 512 },
  { value: "768x768", label: "768 x 768", width: 768, height: 768 },
  { value: "1024x1024", label: "1024 x 1024", width: 1024, height: 1024 },
  {
    value: "2048x2048",
    label: "2048 x 2048 (2K)",
    width: 2048,
    height: 2048,
    requires: "diffusion-mid",
  },
  {
    value: "4096x4096",
    label: "4096 x 4096 (4K)",
    width: 4096,
    height: 4096,
    requires: "diffusion-high",
  },
];

const TIER_RANK: Record<DiffusionTierId, number> = {
  "diffusion-low": 0,
  "diffusion-mid": 1,
  "diffusion-high": 2,
  "diffusion-pro": 3,
};

export function tierMeets(actual: DiffusionTierId, required: DiffusionTierId): boolean {
  return TIER_RANK[actual] >= TIER_RANK[required];
}

export function visibleResolutions(tier: DiffusionTierId): readonly ResolutionOption[] {
  return RESOLUTION_OPTIONS.filter((opt) => !opt.requires || tierMeets(tier, opt.requires));
}

const LOW_BUDGET = defaultMemoryBudget("diffusion-low");

export const DEFAULT_FORM_VALUES: PromptFormValues = {
  prompt: "",
  negativePrompt: "",
  modelId: "sana-1.6b-1024",
  width: 1024,
  height: 1024,
  steps: 14,
  cfgScale: 4.5,
  sampler: "flow-dpm-solver",
  seed: 0,
  fastPreview: false,
  loras: [],
  maxCacheVramGB: LOW_BUDGET.maxCacheVramGB,
  maxCacheRamGB: LOW_BUDGET.maxCacheRamGB,
  workingMemReserveGB: LOW_BUDGET.workingMemReserveGB,
  layerStreaming: LOW_BUDGET.layerStreaming,
};

export function ImagePromptForm({
  initial,
  availableModels,
  availableLoras,
  availableControlNets,
  disabled,
  onChange,
  diffusionTier = "diffusion-low",
  fastPreviewModelId = FAST_PREVIEW_MODEL_ID,
}: ImagePromptFormProps): JSX.Element {
  const [values, setValues] = useState<PromptFormValues>({
    ...DEFAULT_FORM_VALUES,
    ...defaultMemoryBudget(diffusionTier),
    ...initial,
  });
  /**
   * v2.4.9: the option lists come from the SELECTED MODEL, intersected with
   * what the host tier can run. Tier alone is what offered a 16 GB card
   * 4096x4096 on a service that caps a request at 2048.
   */
  const caps = useMemo(() => imageCapabilitiesFor(values.modelId), [values.modelId]);
  const allowedResolutions = useMemo(() => {
    const byTier = new Set(visibleResolutions(diffusionTier).map((r) => r.value));
    const withinTier = caps.resolutions.filter((r) => byTier.has(r.value));
    // A model whose sizes the tier does not list (a non-square SDXL bucket, say)
    // still gets its own list: the model is the authority on what it accepts.
    return withinTier.length > 0 ? withinTier : caps.resolutions;
  }, [caps, diffusionTier]);
  const selectedResolutionValue = `${values.width}x${values.height}`;
  const selectedResolutionTooHigh = !allowedResolutions.some(
    (r) => r.value === selectedResolutionValue,
  );
  const budgetCheck = useMemo(
    () =>
      validateMemoryBudget({
        budget: {
          maxCacheVramGB: values.maxCacheVramGB,
          maxCacheRamGB: values.maxCacheRamGB,
          workingMemReserveGB: values.workingMemReserveGB,
          layerStreaming: values.layerStreaming,
        },
        modelMinVramGB: 4,
      }),
    [
      values.maxCacheVramGB,
      values.maxCacheRamGB,
      values.workingMemReserveGB,
      values.layerStreaming,
    ],
  );

  function update<K extends keyof PromptFormValues>(key: K, value: PromptFormValues[K]): void {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      onChange?.(next);
      return next;
    });
  }

  function applyResolution(value: string): void {
    const opt = RESOLUTION_OPTIONS.find((r) => r.value === value);
    if (!opt) return;
    setValues((prev) => {
      const next = { ...prev, width: opt.width, height: opt.height };
      onChange?.(next);
      return next;
    });
  }

  function addLora(): void {
    const next = [...values.loras, { id: availableLoras[0]?.id ?? "", weight: 1.0 }];
    update("loras", next);
  }

  function updateLora(index: number, patch: Partial<LoraRef>): void {
    const next = values.loras.map((entry, i) => (i === index ? { ...entry, ...patch } : entry));
    update("loras", next);
  }

  function removeLora(index: number): void {
    update("loras", values.loras.filter((_, i) => i !== index));
  }

  function toggleControlNet(enabled: boolean): void {
    if (!enabled) {
      update("controlNet", undefined);
    } else {
      update("controlNet", {
        modelId: availableControlNets[0]?.id ?? "",
        conditionImage: "",
        weight: 1.0,
        preprocessor: "canny",
      });
    }
  }

  return (
    <StudioSettingsPanel title="Image settings" testId="image-settings-panel">
      <form
        data-testid="image-prompt-form"
        onSubmit={(e) => e.preventDefault()}
        style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
      >
        <StudioSettingsSection title="Output" testId="image-section-output">
          <StudioSettingsField label="Model">
            <Select
              data-testid="image-model"
              value={values.modelId}
              disabled={disabled}
              onChange={(e) => update("modelId", e.target.value)}
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </Select>
          </StudioSettingsField>
          <StudioSettingsField
            label="Resolution"
            hint={
              selectedResolutionTooHigh ? (
                <span
                  data-testid="image-resolution-tier-hint"
                  style={{ fontSize: "var(--text-xs)", color: "var(--accent-warning, #f59e0b)" }}
                >
                  Requires diffusion-high tier
                </span>
              ) : undefined
            }
          >
            <Select
              data-testid="image-resolution"
              value={selectedResolutionValue}
              disabled={disabled}
              onChange={(e) => applyResolution(e.target.value)}
            >
              {allowedResolutions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </StudioSettingsField>
          <StudioSettingsField label="Width">
            <TextField
              testId="image-width"
              type="number"
              min={64}
              max={4096}
              step={8}
              value={String(values.width)}
              disabled={disabled}
              onChange={(v) => update("width", Number(v))}
            />
          </StudioSettingsField>
          <StudioSettingsField label="Height">
            <TextField
              testId="image-height"
              type="number"
              min={64}
              max={4096}
              step={8}
              value={String(values.height)}
              disabled={disabled}
              onChange={(v) => update("height", Number(v))}
            />
          </StudioSettingsField>
          <StudioSettingsField full label="Fast preview">
            <Switch
              testId="image-fast-preview-toggle"
              checked={values.fastPreview}
              disabled={disabled}
              onChange={(on) => update("fastPreview", on)}
              label={
                <span>
                  1-step Sana-Sprint, about 0.5 s
                  {values.fastPreview ? (
                    <span
                      data-testid="image-fast-preview-model"
                      style={{ marginLeft: "var(--space-2)", color: "var(--accent, #10b981)" }}
                    >
                      using {fastPreviewModelId}
                    </span>
                  ) : null}
                </span>
              }
            />
          </StudioSettingsField>
        </StudioSettingsSection>

        <StudioSettingsSection title="Sampling" testId="image-section-sampling">
          <StudioSettingsField label="Steps">
            <TextField
              testId="image-steps"
              type="number"
              min={1}
              max={150}
              value={String(values.steps)}
              disabled={disabled}
              onChange={(v) => update("steps", Number(v))}
            />
          </StudioSettingsField>
          <StudioSettingsField
            label="CFG"
            {...(caps.cfgScale
              ? {}
              : {
                  hint: (
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)" }}>
                      {capabilityNote(caps, "cfgScale") ??
                        "This model is guidance-free; CFG has no effect."}
                    </span>
                  ),
                })}
          >
            <TextField
              testId="image-cfg"
              type="number"
              min={caps.cfgScale?.min ?? 0}
              max={caps.cfgScale?.max ?? 30}
              step={caps.cfgScale?.step ?? 0.1}
              value={String(values.cfgScale)}
              disabled={disabled || caps.cfgScale === null}
              onChange={(v) => update("cfgScale", Number(v))}
            />
          </StudioSettingsField>
          <StudioSettingsField label="Sampler">
            <Select
              data-testid="image-sampler"
              value={values.sampler}
              disabled={disabled}
              onChange={(e) => update("sampler", e.target.value)}
            >
              {(caps.samplers.length > 0 ? caps.samplers : SAMPLERS).map((sampler) => (
                <option key={sampler} value={sampler}>
                  {sampler}
                </option>
              ))}
            </Select>
          </StudioSettingsField>
          <StudioSettingsField label="Seed">
            <TextField
              testId="image-seed"
              type="number"
              min={0}
              value={String(values.seed)}
              disabled={disabled}
              onChange={(v) => update("seed", Number(v))}
            />
          </StudioSettingsField>
        </StudioSettingsSection>

        <StudioSettingsSection
          title="Prompting"
          hint="The composer sends the prompt; these carry across turns."
          testId="image-section-prompting"
        >
          <StudioSettingsField
            full
            label={
              <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
                Prompt
                <span
                  data-testid="image-prompt-multilang-hint"
                  title="Supports English, Chinese, and Emoji (multilingual model)."
                  aria-label="Supports English, Chinese, and Emoji (multilingual model)."
                  style={{
                    display: "inline-flex",
                    width: "1em",
                    height: "1em",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    border: "1px solid var(--fg-muted)",
                    fontSize: "0.7em",
                    cursor: "help",
                  }}
                >
                  i
                </span>
              </span>
            }
          >
            <TextField
              multiline
              testId="image-prompt"
              rows={3}
              value={values.prompt}
              disabled={disabled}
              onChange={(v) => update("prompt", v)}
            />
          </StudioSettingsField>
          <StudioSettingsField full label="Negative prompt">
            <TextField
              multiline
              testId="image-negative-prompt"
              rows={2}
              value={values.negativePrompt}
              disabled={disabled}
              onChange={(v) => update("negativePrompt", v)}
            />
          </StudioSettingsField>
        </StudioSettingsSection>

        <StudioSettingsSection title="LoRAs and ControlNet" testId="image-section-conditioning">
          <StudioSettingsField full label="LoRAs">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <Button testId="image-add-lora" type="button" onClick={addLora} disabled={disabled}>
                + LoRA
              </Button>
              {values.loras.map((lora, i) => (
                <div
                  key={`lora-${i}`}
                  data-testid={`image-lora-${i}`}
                  style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}
                >
                  <Select
                    data-testid={`image-lora-id-${i}`}
                    value={lora.id}
                    onChange={(e) => updateLora(i, { id: e.target.value })}
                  >
                    {availableLoras.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.displayName}
                      </option>
                    ))}
                  </Select>
                  <TextField
                    testId={`image-lora-weight-${i}`}
                    type="number"
                    step={0.05}
                    min={-2}
                    max={2}
                    value={String(lora.weight)}
                    onChange={(v) => updateLora(i, { weight: Number(v) })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    testId={`image-lora-remove-${i}`}
                    onClick={() => removeLora(i)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </StudioSettingsField>
          <StudioSettingsField full label="ControlNet">
            <Switch
              testId="image-controlnet-toggle"
              checked={Boolean(values.controlNet)}
              disabled={disabled}
              onChange={(on) => toggleControlNet(on)}
              label="Condition generation on a reference image"
            />
          </StudioSettingsField>
          {values.controlNet ? (
            <StudioSettingsField full label="ControlNet model and preprocessor">
              <div
                data-testid="image-controlnet-fields"
                style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}
              >
                <Select
                  data-testid="image-controlnet-model"
                  value={values.controlNet.modelId}
                  onChange={(e) =>
                    update("controlNet", { ...values.controlNet!, modelId: e.target.value })
                  }
                >
                  {availableControlNets.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName}
                    </option>
                  ))}
                </Select>
                <Select
                  data-testid="image-controlnet-preprocessor"
                  value={values.controlNet.preprocessor}
                  onChange={(e) =>
                    update("controlNet", {
                      ...values.controlNet!,
                      preprocessor: e.target.value as ControlNetRef["preprocessor"],
                    })
                  }
                >
                  <option value="canny">Canny</option>
                  <option value="pose">Pose</option>
                  <option value="depth">Depth</option>
                  <option value="none">None</option>
                </Select>
              </div>
            </StudioSettingsField>
          ) : null}
        </StudioSettingsSection>

        <StudioSettingsSection title="VRAM budget" testId="image-memory-budget">
          <StudioSettingsField label="Max cache VRAM (GB)">
            <TextField
              testId="image-max-cache-vram"
              type="number"
              min={0.5}
              step={0.5}
              value={String(values.maxCacheVramGB)}
              disabled={disabled}
              onChange={(v) => update("maxCacheVramGB", Number(v))}
            />
          </StudioSettingsField>
          <StudioSettingsField label="Max cache RAM (GB)">
            <TextField
              testId="image-max-cache-ram"
              type="number"
              min={1}
              step={1}
              value={String(values.maxCacheRamGB)}
              disabled={disabled}
              onChange={(v) => update("maxCacheRamGB", Number(v))}
            />
          </StudioSettingsField>
          <StudioSettingsField label="Working reserve (GB)">
            <TextField
              testId="image-working-reserve"
              type="number"
              min={0}
              step={0.5}
              value={String(values.workingMemReserveGB)}
              disabled={disabled}
              onChange={(v) => update("workingMemReserveGB", Number(v))}
            />
          </StudioSettingsField>
          <StudioSettingsField full label="Layer streaming">
            <Switch
              testId="image-layer-streaming"
              checked={values.layerStreaming}
              disabled={disabled}
              onChange={(on) => update("layerStreaming", on)}
              label="Complete a previously too-small VRAM load"
            />
          </StudioSettingsField>
          {!budgetCheck.ok ? (
            <StudioSettingsField full label="Budget">
              <p
                data-testid="image-budget-error"
                style={{ color: "var(--accent-danger, #f87171)", margin: 0, fontSize: "var(--text-xs)" }}
              >
                {budgetCheck.errors.join(" ")}
              </p>
            </StudioSettingsField>
          ) : null}
          {budgetCheck.warnings.length > 0 ? (
            <StudioSettingsField full label="Notes">
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {budgetCheck.warnings.map((warning) => (
                  <p
                    key={warning}
                    data-testid="image-budget-warning"
                    style={{ color: "var(--fg-muted)", margin: 0, fontSize: "var(--text-xs)" }}
                  >
                    {warning}
                  </p>
                ))}
              </div>
            </StudioSettingsField>
          ) : null}
        </StudioSettingsSection>
      </form>
    </StudioSettingsPanel>
  );
}

export function valuesToBaseRequest(
  values: PromptFormValues,
  overrides: Partial<PromptFormValues> = {},
  options: { readonly fastPreviewModelId?: string } = {},
): Record<string, unknown> {
  const merged = { ...values, ...overrides };
  const fastPreviewModelId = options.fastPreviewModelId ?? FAST_PREVIEW_MODEL_ID;
  const effectiveModelId = merged.fastPreview ? fastPreviewModelId : merged.modelId;
  const effectiveSteps = merged.fastPreview ? 1 : merged.steps;
  const effectiveSampler = merged.fastPreview ? "flow-dpm-solver" : merged.sampler;
  const out: Record<string, unknown> = {
    modelId: foldModelId(effectiveModelId),
    prompt: merged.prompt,
    negativePrompt: merged.negativePrompt || undefined,
    width: merged.width,
    height: merged.height,
    steps: effectiveSteps,
    cfgScale: merged.cfgScale,
    sampler: effectiveSampler,
    seed: merged.seed,
    batchSize: 1,
    latentPreview: true,
    loras: [...merged.loras],
    maxCacheVramGB: merged.maxCacheVramGB,
    maxCacheRamGB: merged.maxCacheRamGB,
    workingMemReserveGB: merged.workingMemReserveGB,
    layerStreaming: merged.layerStreaming,
  };
  if (merged.controlNet) {
    out.controlNet = { ...merged.controlNet };
  }
  return out;
}
