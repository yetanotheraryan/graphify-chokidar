import { execa } from "execa";

export async function runGraphify(targetPath: string, cancelSignal?: AbortSignal): Promise<{
  success: boolean;
  durationMs: number;
  output: string;
  cancelled: boolean;
}> {
  const start = Date.now();
  try {
    const result = await execa("graphify", ["update", targetPath], {
      all: true,
      ...(cancelSignal ? { cancelSignal } : {}),
    });
    return { success: true, durationMs: Date.now() - start, output: result.all ?? "", cancelled: false };
  } catch (err: any) {
    if (err.isCanceled) {
      return { success: false, durationMs: Date.now() - start, output: "", cancelled: true };
    }
    return { success: false, durationMs: Date.now() - start, output: err.all ?? err.message ?? "unknown error", cancelled: false };
  }
}
