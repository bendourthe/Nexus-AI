import { describe, expect, it } from "vitest";
import {
  classifySplatHost,
  parseSplatGenerateParameters,
  prepareSplatGenerate,
  splatHostMessage,
  stubSplatBytes,
} from "../../../../core/image/SplatGenerate.js";
import { decodeSplatBytes } from "../../../../core/image/GaussianSplat.js";

describe("splat generate preflight", () => {
  it("fails closed for macOS, AMD or CPU, and NVIDIA without CUDA", () => {
    expect(classifySplatHost({ platform: "darwin", nvidia: true, cuda: true })).toBe("unsupported-platform");
    expect(classifySplatHost({ platform: "linux", nvidia: false, cuda: false })).toBe("unsupported-platform");
    expect(classifySplatHost({ platform: "win32", nvidia: true, cuda: false })).toBe("cuda-missing");
    expect(classifySplatHost({ platform: "linux", nvidia: true, cuda: true })).toBe("ready");
    expect(splatHostMessage("cuda-missing")).toMatch(/did not start/);
  });

  it("rejects remote and malformed requests before a host check", () => {
    const remote = prepareSplatGenerate(
      { sourceMessageId: "msg-1", sourcePngPath: "https://3daistudio.com/a.png", outputId: "out-1" },
      { platform: "linux", nvidia: true, cuda: true },
    );
    expect(remote.ok).toBe(false);
    if (!remote.ok) expect(remote.code).toBe("remote-url");
    const missing = parseSplatGenerateParameters({ sourceMessageId: "../x", sourcePngPath: "a.png", outputId: "out" });
    expect(missing.ok).toBe(false);
  });

  it("writes one decodable splat row from the stub", () => {
    const decoded = decodeSplatBytes(stubSplatBytes());
    expect(decoded.count).toBe(1);
    expect(decoded.format).toBe("splat");
  });
});
