/** Image caps for vision / analysis uploads (matches AgentChatView historical behavior). */
export const IMAGE_ANALYSIS_MAX_DIMENSION = 1600;
export const IMAGE_ANALYSIS_MAX_BYTES = 2_000_000;

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function optimizeImageForAnalysis(file: File): Promise<{ base64: string; mimeType: string }> {
  const originalDataUrl = await fileToDataUrl(file);
  const originalBase64 = originalDataUrl.split(",")[1] || "";

  if (!file.type.startsWith("image/") || file.size <= 1_500_000) {
    return { base64: originalBase64, mimeType: file.type || "image/png" };
  }

  let objectUrl: string | null = null;
  try {
    objectUrl = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = objectUrl as string;
    });

    const largestSide = Math.max(img.naturalWidth, img.naturalHeight, 1);
    const scale = Math.min(1, IMAGE_ANALYSIS_MAX_DIMENSION / largestSide);
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { base64: originalBase64, mimeType: file.type || "image/png" };
    }

    ctx.drawImage(img, 0, 0, width, height);

    const mimeType = "image/jpeg";
    let quality = 0.82;
    let optimizedDataUrl = canvas.toDataURL(mimeType, quality);
    let estimatedBytes = Math.ceil((optimizedDataUrl.length * 3) / 4);

    while (estimatedBytes > IMAGE_ANALYSIS_MAX_BYTES && quality > 0.45) {
      quality -= 0.1;
      optimizedDataUrl = canvas.toDataURL(mimeType, quality);
      estimatedBytes = Math.ceil((optimizedDataUrl.length * 3) / 4);
    }

    return {
      base64: optimizedDataUrl.split(",")[1] || originalBase64,
      mimeType,
    };
  } catch {
    return { base64: originalBase64, mimeType: file.type || "image/png" };
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

export async function readFileContent(
  file: File,
  session: { access_token: string },
): Promise<string> {
  const textTypes = ["text/", "application/json", "application/xml", "text/csv", "application/csv"];
  const isText =
    textTypes.some((t) => file.type.startsWith(t)) ||
    /\.(txt|md|csv|json|xml|html|css|js|ts|py|log|yml|yaml|toml|ini|cfg|env)$/i.test(file.name);

  if (isText) {
    const text = await file.text();
    return text.slice(0, 50000);
  }

  if (file.type.startsWith("image/")) {
    try {
      const optimized = await optimizeImageForAnalysis(file);
      return `__IMAGE_BASE64__${optimized.mimeType}__${optimized.base64}`;
    } catch {
      return `[File: ${file.name} (image, ${(file.size / 1024).toFixed(1)}KB)]`;
    }
  }

  try {
    const base64Data = (await fileToDataUrl(file)).split(",")[1] || "";
    let analyzeType = "document";
    let contentBody: Record<string, string> = {
      documentName: file.name,
      fileBase64: base64Data,
      fileMimeType: file.type,
    };

    if (file.type.startsWith("audio/")) {
      analyzeType = "audio";
      contentBody = { fileName: file.name, fileBase64: base64Data, fileMimeType: file.type };
    } else if (file.type.startsWith("video/")) {
      analyzeType = "video";
      contentBody = { fileName: file.name, fileBase64: base64Data, fileMimeType: file.type };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      signal: controller.signal,
      body: JSON.stringify({ type: analyzeType, content: contentBody }),
    });
    clearTimeout(timeout);

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.analysis) {
        return `[Analysis of ${file.name}]\n${result.analysis}`;
      }
    }
  } catch (err) {
    console.error("File analysis error:", err);
  }

  return `[File: ${file.name} (${file.type || "unknown"}, ${(file.size / 1024).toFixed(1)}KB) — could not analyze]`;
}

export type UploadedFileChip = { id: string; name: string; file?: File };

export async function processFiles(
  files: UploadedFileChip[],
  session: { access_token: string },
  userId: string,
  uploadToStorage: (path: string, file: File) => Promise<unknown>,
): Promise<{ name: string; content: string }[]> {
  const validFiles = files.filter((f) => f.file);
  if (validFiles.length === 0) return [];

  for (const f of validFiles) {
    if (!f.file) continue;
    const path = `${userId}/chat/${Date.now()}-${f.name}`;
    uploadToStorage(path, f.file).catch(() => {});
  }

  const results = await Promise.all(
    validFiles.map(async (f) => ({
      name: f.name,
      content: await readFileContent(f.file!, session),
    })),
  );
  return results;
}
