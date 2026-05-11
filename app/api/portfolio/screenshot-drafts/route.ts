import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { NextResponse } from "next/server";

import { findScreenshotFundAlias } from "@/lib/fund-aliases";

export const runtime = "nodejs";

type ScreenshotDraft = {
  fundName: string;
  marketValue: number | null;
  dayProfit: number | null;
  holdingProfit: number | null;
  holdingReturn: number | null;
  fundCode?: string;
  sourceImageName?: string;
  confidence?: "high" | "medium" | "low";
  warning?: string;
};

type RecognitionPayload = {
  drafts?: ScreenshotDraft[];
  rawText?: string;
  warnings?: string[];
};

type LocalOcrLine = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type LocalOcrPage = {
  sourceImageName: string;
  text: string;
  width: number;
  height: number;
  lines: LocalOcrLine[];
};

type LocalOcrResult = {
  text: string;
  pages: LocalOcrPage[];
  warnings: string[];
};

const execFileAsync = promisify(execFile);

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const IMAGE_EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif"
};
const MAX_IMAGE_COUNT = 8;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    drafts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          fundName: { type: "string" },
          marketValue: { type: ["number", "null"] },
          dayProfit: { type: ["number", "null"] },
          holdingProfit: { type: ["number", "null"] },
          holdingReturn: { type: ["number", "null"] },
          fundCode: { type: ["string", "null"] },
          sourceImageName: { type: ["string", "null"] },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          warning: { type: ["string", "null"] }
        },
        required: [
          "fundName",
          "marketValue",
          "dayProfit",
          "holdingProfit",
          "holdingReturn",
          "fundCode",
          "sourceImageName",
          "confidence",
          "warning"
        ]
      }
    },
    rawText: { type: "string" },
    warnings: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["drafts", "rawText", "warnings"]
} as const;

function isFile(value: FormDataEntryValue): value is File {
  return typeof value === "object" && "arrayBuffer" in value && "type" in value && "name" in value;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function filledFieldCount(draft: ScreenshotDraft) {
  return [draft.marketValue, draft.dayProfit, draft.holdingProfit, draft.holdingReturn].filter(
    (value) => value !== null && value !== undefined
  ).length;
}

function normalizeDrafts(drafts: ScreenshotDraft[] | undefined): ScreenshotDraft[] {
  const byName = new Map<string, ScreenshotDraft>();

  for (const draft of drafts ?? []) {
    const fundName = String(draft.fundName ?? "").trim();
    if (!fundName) continue;

    const alias = findScreenshotFundAlias(fundName);
    const normalized: ScreenshotDraft = {
      fundName: alias?.displayName ?? fundName,
      fundCode: alias?.code,
      marketValue: numberOrNull(draft.marketValue),
      dayProfit: numberOrNull(draft.dayProfit),
      holdingProfit: numberOrNull(draft.holdingProfit),
      holdingReturn: numberOrNull(draft.holdingReturn),
      sourceImageName: draft.sourceImageName ? String(draft.sourceImageName) : undefined,
      confidence: draft.confidence ?? "medium",
      warning: draft.warning ? String(draft.warning) : undefined
    };

    const key = (normalized.fundCode ? `code-${normalized.fundCode}` : normalized.fundName).replace(/\s+/g, "");
    const existing = byName.get(key);
    if (!existing || filledFieldCount(normalized) > filledFieldCount(existing)) {
      byName.set(key, normalized);
    }
  }

  return Array.from(byName.values());
}

function extractOutputText(payload: any): string {
  if (typeof payload.output_text === "string") return payload.output_text;

  const chunks: string[] = [];
  for (const output of payload.output ?? []) {
    for (const content of output.content ?? []) {
      if (typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join("\n").trim();
}

function normalizeOcrText(text: string) {
  return text
    .replace(/\s+/g, "")
    .replace(/[，､]/g, ",")
    .replace(/[．。]/g, ".")
    .replace(/[％]/g, "%")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[一—－–]/g, "-")
    .trim();
}

function numericValue(raw: string) {
  const value = Number(normalizeOcrText(raw).replace(/[,+%\s]/g, "").replace(/[Ll]/g, "1"));
  return Number.isFinite(value) ? value : null;
}

function parseOcrNumber(raw: string) {
  const normalized = normalizeOcrText(raw)
    .replace(/[Ll]/g, "1")
    .replace(/乙/g, "2")
    .replace(/([+-]?\d+),(\d{1,2})%?$/, "$1.$2%")
    .replace(/([+-]?\d+),(\d{2})$/, "$1.$2");
  const match = normalized.match(/[+-]?\d[\d,]*(?:\.\d+)?%?/);
  if (!match) return null;
  const value = numericValue(match[0]);
  if (value === null) return null;
  return { value, isPercent: match[0].includes("%") };
}

function centerX(line: LocalOcrLine) {
  return line.x + line.width / 2;
}

function centerY(line: LocalOcrLine) {
  return line.y + line.height / 2;
}

function isNumericLine(line: LocalOcrLine) {
  return parseOcrNumber(line.text) !== null;
}

function cleanFundName(parts: string[]) {
  return parts
    .join("")
    .replace(/\s+/g, "")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .trim();
}

function normalizeFundNameFromOcr(name: string) {
  return name
    .replace(/[“”"．.]+$/g, "")
    .replace(/QD[围回囗]c/gi, "QDII)C")
    .replace(/\(QDII\)C/i, "(QDII)C")
    .replace(/冫比口/g, "混合")
    .replace(/九匕/g, "混合")
    .replace(/Å\*接/g, "联接")
    .replace(/智选九匕/g, "智选混合")
    .replace(/产业冫比口/g, "产业混合")
    .replace(/晶国/g, "富国")
    .replace(/混$/, "混合C")
    .replace(/股$/, "股票C")
    .replace(/股票$/, "股票C")
    .replace(/混合$/, "混合C")
    .replace(/ETF$/, "ETF联接C")
    .replace(/主题ET$/, "主题ETF联接C")
    .replace(/\.\.\.$/, "")
    .trim();
}

function isLikelyFundName(name: string) {
  return /[\u4e00-\u9fff]/.test(name) && /(基金|混|混合|股票|指数|债券|QDII|ETF|联接|C|A|主题)/i.test(name);
}

function isNoiseNameLine(line: LocalOcrLine) {
  const text = normalizeOcrText(line.text);
  return (
    !text ||
    /^###/.test(text) ||
    /^(基金|我的持有|全部|偏股|偏债|指数|黄金|名称|金额排序|金额\/昨日收益|持有收益\/率|定投|持有|自选|机会|基金市场)$/.test(text) ||
    /^\d{1,2}:\d{2}$/.test(text) ||
    text.includes("主要包含") ||
    text.includes("进阶类") ||
    text.includes("市场解读") ||
    text.includes("基金经理说") ||
    text.includes("基金销售") ||
    text.includes("本页面") ||
    text === "0" ||
    text === "回" ||
    text === "国" ||
    text === "闂" ||
    text === "閔"
  );
}

function isNameLine(line: LocalOcrLine) {
  const text = normalizeOcrText(line.text);
  return Boolean(text) && !isNoiseNameLine(line) && !isNumericLine(line) && /[\u4e00-\u9fffA-Za-z]/.test(text);
}

function nearestNumber(lines: LocalOcrLine[], targetY: number, xMin: number, xMax: number, used: Set<LocalOcrLine>, maxDistance = 70) {
  const match = lines
    .filter((line) => !used.has(line))
    .filter((line) => {
      const x = centerX(line);
      return x >= xMin && x <= xMax && isNumericLine(line);
    })
    .map((line) => ({ line, distance: Math.abs(centerY(line) - targetY) }))
    .filter((item) => item.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)[0]?.line;

  if (!match) return null;
  used.add(match);
  return parseOcrNumber(match.text)?.value ?? null;
}

function parseAlipayGeometryDrafts(page: LocalOcrPage): ScreenshotDraft[] {
  const headerY = page.lines.find((line) => normalizeOcrText(line.text).includes("金额/昨日收益"))?.y ?? page.height * 0.27;
  const footerY =
    page.lines.find((line) => normalizeOcrText(line.text).includes("基金销售服务"))?.y ??
    page.lines.find((line) => normalizeOcrText(line.text).includes("更多产品"))?.y ??
    page.height * 0.94;
  const topY = Math.min(headerY - 8, page.height * 0.25);
  const bottomY = Math.min(footerY, page.height * 0.94);
  const content = page.lines.filter((line) => line.y > topY && line.y < bottomY);

  const nameMaxX = page.width * 0.43;
  const valueMinX = page.width * 0.36;
  const valueMaxX = page.width * 0.70;
  const profitMinX = page.width * 0.68;
  const profitMaxX = page.width * 0.98;

  const nameLines = content
    .filter((line) => line.x < nameMaxX && isNameLine(line))
    .sort((a, b) => a.y - b.y || a.x - b.x);

  const groups: LocalOcrLine[][] = [];
  for (const line of nameLines) {
    const previous = groups[groups.length - 1];
    if (previous && line.y - previous[previous.length - 1].y <= 42) {
      previous.push(line);
    } else {
      groups.push([line]);
    }
  }

  const numericLines = content.filter(isNumericLine);
  const used = new Set<LocalOcrLine>();
  const draftedGroups = new Set<LocalOcrLine[]>();
  const drafts = groups
    .map((group): ScreenshotDraft | null => {
      const fundName = normalizeFundNameFromOcr(cleanFundName(group.map((line) => line.text)));
      if (!isLikelyFundName(fundName)) return null;

      const yTop = Math.min(...group.map((line) => line.y));
      const yBottom = Math.max(...group.map((line) => line.y + line.height));
      const mainY = yTop + (yBottom - yTop) * 0.35;
      const subY = yBottom + 20;

      const marketValue = nearestNumber(numericLines, mainY, valueMinX, valueMaxX, used);
      const dayProfit = nearestNumber(numericLines, subY, valueMinX, valueMaxX, used);
      const holdingProfit = nearestNumber(numericLines, mainY, profitMinX, profitMaxX, used);
      const holdingReturn = nearestNumber(numericLines, subY, profitMinX, profitMaxX, used);
      const normalizedMarketValue =
        marketValue !== null && marketValue > 1_000_000 && Number.isInteger(marketValue) ? marketValue / 100 : marketValue;
      if (marketValue === null && holdingProfit === null) return null;
      draftedGroups.add(group);

      return {
        fundName,
        marketValue: normalizedMarketValue,
        dayProfit,
        holdingProfit,
        holdingReturn,
        sourceImageName: page.sourceImageName,
        confidence: marketValue !== null && holdingProfit !== null ? "high" : "medium",
        warning: "本地 OCR 按支付宝持仓坐标版式解析，请导入前校对名称和金额。"
      };
    })
    .filter((item): item is ScreenshotDraft => Boolean(item));

  const draftedNameLines = new Set(Array.from(draftedGroups).flat());
  const unusedNameGroups = groups.filter((group) => !group.some((line) => draftedNameLines.has(line)));
  const usedFallback = new Set<LocalOcrLine>();
  const marketValueLines = numericLines
    .filter((line) => {
      const x = centerX(line);
      return x >= valueMinX && x <= valueMaxX && !used.has(line);
    })
    .sort((a, b) => a.y - b.y);

  for (const marketLine of marketValueLines) {
    const y = centerY(marketLine);
    const group = unusedNameGroups
      .map((candidate) => ({
        group: candidate,
        distance: Math.abs(candidate.reduce((sum, line) => sum + centerY(line), 0) / candidate.length - y)
      }))
      .filter((item) => item.distance <= 85)
      .sort((a, b) => a.distance - b.distance)[0]?.group;

    if (!group) continue;
    const fundName = normalizeFundNameFromOcr(cleanFundName(group.map((line) => line.text)));
    if (!fundName || isNoiseNameLine(group[0])) continue;

    const marketValue = parseOcrNumber(marketLine.text)?.value ?? null;
    const dayProfit = nearestNumber(numericLines, y + 38, valueMinX, valueMaxX, usedFallback);
    const holdingProfit = nearestNumber(numericLines, y, profitMinX, profitMaxX, usedFallback);
    const holdingReturn = nearestNumber(numericLines, y + 38, profitMinX, profitMaxX, usedFallback);
    const normalizedMarketValue =
      marketValue !== null && marketValue > 1_000_000 && Number.isInteger(marketValue) ? marketValue / 100 : marketValue;
    if (normalizedMarketValue === null || holdingProfit === null) continue;

    drafts.push({
      fundName,
      marketValue: normalizedMarketValue,
      dayProfit,
      holdingProfit,
      holdingReturn,
      sourceImageName: page.sourceImageName,
      confidence: isLikelyFundName(fundName) ? "medium" : "low",
      warning: "本地 OCR 从支付宝坐标版式低置信度补全，请导入前重点校对。"
    });
  }

  return normalizeDrafts(drafts);
}

function isPlausibleLocalDraft(draft: ScreenshotDraft) {
  return (
    isLikelyFundName(draft.fundName) &&
    draft.marketValue !== null &&
    draft.marketValue >= 10 &&
    draft.marketValue <= 100_000_000 &&
    (draft.holdingReturn === null || Math.abs(draft.holdingReturn) <= 500)
  );
}

function filterPlausibleLocalDrafts(drafts: ScreenshotDraft[]) {
  return drafts
    .filter(isPlausibleLocalDraft)
    .map((draft) => ({
      ...draft,
      confidence: draft.confidence ?? "medium"
    }));
}

function draftRawText(drafts: ScreenshotDraft[]) {
  return drafts
    .map((item) =>
      [
        item.fundName,
        item.marketValue ?? "",
        item.dayProfit ?? "",
        item.holdingProfit ?? "",
        item.holdingReturn !== null && item.holdingReturn !== undefined ? `${item.holdingReturn}%` : ""
      ]
        .join(" ")
        .trim()
    )
    .join("\n");
}

function plainOcrText(pages: LocalOcrPage[]) {
  return pages.map((page) => `### ${page.sourceImageName}\n${page.text}`).join("\n\n").trim();
}

async function runWindowsOcr(imagePath: string, sourceImageName: string): Promise<LocalOcrPage> {
  const escapedPath = imagePath.replace(/'/g, "''");
  const escapedName = sourceImageName.replace(/'/g, "''");
  const script = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType=WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType=WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType=WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapPixelFormat, Windows.Graphics.Imaging, ContentType=WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapAlphaMode, Windows.Graphics.Imaging, ContentType=WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType=WindowsRuntime] | Out-Null
[Windows.Globalization.Language, Windows.Globalization, ContentType=WindowsRuntime] | Out-Null
$asTaskMethods = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 }
function AwaitOperation($operation, [Type]$resultType) {
  $method = ($script:asTaskMethods | Where-Object { $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
  $task = $method.MakeGenericMethod($resultType).Invoke($null, @($operation))
  $task.Wait()
  return $task.Result
}
$file = AwaitOperation ([Windows.Storage.StorageFile]::GetFileFromPathAsync('${escapedPath}')) ([Windows.Storage.StorageFile])
$stream = AwaitOperation ($file.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
$decoder = AwaitOperation ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
$bitmap = AwaitOperation ($decoder.GetSoftwareBitmapAsync([Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8, [Windows.Graphics.Imaging.BitmapAlphaMode]::Premultiplied)) ([Windows.Graphics.Imaging.SoftwareBitmap])
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new('zh-Hans-CN'))
if ($null -eq $engine) { $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages() }
if ($null -eq $engine) { throw 'Windows OCR engine is unavailable.' }
$result = AwaitOperation ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
$items = @()
foreach ($line in $result.Lines) {
  $left = 999999.0
  $top = 999999.0
  $right = 0.0
  $bottom = 0.0
  foreach ($word in $line.Words) {
    $rect = $word.BoundingRect
    if ($rect.X -lt $left) { $left = $rect.X }
    if ($rect.Y -lt $top) { $top = $rect.Y }
    if (($rect.X + $rect.Width) -gt $right) { $right = $rect.X + $rect.Width }
    if (($rect.Y + $rect.Height) -gt $bottom) { $bottom = $rect.Y + $rect.Height }
  }
  if ($line.Words.Count -gt 0) {
    $items += [pscustomobject]@{
      text = $line.Text
      x = $left
      y = $top
      width = $right - $left
      height = $bottom - $top
    }
  }
}
[pscustomobject]@{
  sourceImageName = '${escapedName}'
  text = $result.Text
  width = $bitmap.PixelWidth
  height = $bitmap.PixelHeight
  lines = $items
} | ConvertTo-Json -Depth 6 -Compress
`;
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded], {
    timeout: 30000,
    windowsHide: true,
    maxBuffer: 2 * 1024 * 1024,
    encoding: "utf8"
  });
  const parsed = JSON.parse(stdout.trim()) as Omit<LocalOcrPage, "sourceImageName"> & { sourceImageName?: string };
  return {
    sourceImageName,
    text: parsed.text ?? "",
    width: Number(parsed.width) || 1,
    height: Number(parsed.height) || 1,
    lines: Array.isArray(parsed.lines) ? parsed.lines : []
  };
}

async function recognizeWithLocalOcr(files: File[]): Promise<LocalOcrResult> {
  if (process.platform !== "win32") {
    return { text: "", pages: [], warnings: ["Local OCR skipped: Windows OCR is only available on Windows."] };
  }

  const dir = await mkdtemp(path.join(tmpdir(), "portfolio-ocr-"));
  const warnings: string[] = [];
  const pages: LocalOcrPage[] = [];

  try {
    for (const [index, file] of files.entries()) {
      const extension = IMAGE_EXTENSION_BY_TYPE[file.type] ?? ".img";
      const filePath = path.join(dir, `image-${index}${extension}`);
      await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
      try {
        const page = await runWindowsOcr(filePath, file.name);
        if (page.text || page.lines.length) {
          pages.push(page);
        } else {
          warnings.push(`${file.name}: local OCR returned no text.`);
        }
      } catch (error) {
        warnings.push(`${file.name}: local OCR failed (${error instanceof Error ? error.message : "unknown error"}).`);
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }

  return { text: plainOcrText(pages), pages, warnings };
}

async function recognizeWithOpenAI(files: File[], warnings: string[], apiKey: string, model: string) {
  const imageContent = await Promise.all(
    files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      return {
        type: "input_image",
        image_url: `data:${file.type};base64,${buffer.toString("base64")}`,
        detail: "high"
      };
    })
  );

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "Recognize Alipay or fund-platform holding screenshots and extract only portfolio holding drafts.",
                "Fields: fund name, market value, yesterday profit, holding profit, holding return percentage.",
                "Return null for unclear or missing money fields. Do not guess.",
                "Deduplicate same fund names across multiple images and keep the most complete row.",
                `Source image names: ${files.map((file) => file.name).join(", ")}`,
                "Use numeric values only. Remove currency symbols, commas, and percent signs."
              ].join("\n")
            },
            ...imageContent
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "portfolio_screenshot_drafts",
          strict: true,
          schema: responseSchema
        }
      }
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    return NextResponse.json(
      {
        status: "recognition_failed",
        imageCount: files.length,
        drafts: [],
        warnings: [...warnings, payload.error?.message ?? "Vision recognition service failed."]
      },
      { status: response.status }
    );
  }

  const outputText = extractOutputText(payload);
  const parsed = JSON.parse(outputText || "{}") as RecognitionPayload;
  const drafts = normalizeDrafts(parsed.drafts);

  return NextResponse.json({
    status: "ok",
    imageCount: files.length,
    drafts,
    rawText: parsed.rawText || draftRawText(drafts),
    warnings: [...warnings, ...(parsed.warnings ?? [])]
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_VISION_MODEL || "gpt-5.4-mini";

  let files: File[];
  try {
    const formData = await request.formData();
    files = formData.getAll("images").filter(isFile);
  } catch {
    return NextResponse.json(
      {
        status: "recognition_failed",
        imageCount: 0,
        drafts: [],
        warnings: ["Unable to read uploaded image form data."]
      },
      { status: 400 }
    );
  }

  const warnings: string[] = [];
  const acceptedFiles = files.slice(0, MAX_IMAGE_COUNT).filter((file) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      warnings.push(`${file.name}: unsupported image type ${file.type || "unknown"}.`);
      return false;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      warnings.push(`${file.name}: skipped because it is larger than 12MB.`);
      return false;
    }
    return true;
  });

  if (files.length > MAX_IMAGE_COUNT) {
    warnings.push(`At most ${MAX_IMAGE_COUNT} screenshots are recognized at once; extra images were ignored.`);
  }

  if (!acceptedFiles.length) {
    return NextResponse.json(
      {
        status: "recognition_failed",
        imageCount: files.length,
        drafts: [],
        warnings: warnings.length ? warnings : ["No recognizable images were uploaded."]
      },
      { status: 400 }
    );
  }

  const localOcr = await recognizeWithLocalOcr(acceptedFiles);
  const localDrafts = filterPlausibleLocalDrafts(
    normalizeDrafts(localOcr.pages.flatMap((page) => parseAlipayGeometryDrafts(page)))
  );

  if (localDrafts.length) {
    return NextResponse.json({
      status: "ok",
      imageCount: acceptedFiles.length,
      drafts: localDrafts,
      rawText: localOcr.text || draftRawText(localDrafts),
      warnings: [...warnings, ...localOcr.warnings, "Used local Windows OCR geometry parsing before AI fallback."].filter(Boolean)
    });
  }

  warnings.push(...localOcr.warnings);

  if (!apiKey) {
    return NextResponse.json({
      status: "config_missing",
      imageCount: acceptedFiles.length,
      drafts: [],
      rawText: localOcr.text,
      warnings: [
        ...warnings,
        "Local OCR did not extract fund holding rows, and OPENAI_API_KEY is not configured for AI fallback."
      ]
    });
  }

  try {
    return await recognizeWithOpenAI(acceptedFiles, warnings, apiKey, model);
  } catch (error) {
    return NextResponse.json(
      {
        status: "recognition_failed",
        imageCount: acceptedFiles.length,
        drafts: [],
        rawText: localOcr.text,
        warnings: [error instanceof Error ? error.message : "Screenshot recognition failed."]
      },
      { status: 502 }
    );
  }
}
