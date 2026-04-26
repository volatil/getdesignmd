import { chromium } from "playwright";
import { existsSync } from "node:fs";
import type { ColorToken, DesignAnalysis, ShapeToken, TypographyToken } from "./design-types";
import { createDesignMarkdown } from "./markdown";

type RawElement = {
  tag: string;
  role: string;
  text: string;
  width: number;
  height: number;
  marginTop: string;
  marginBottom: string;
  paddingTop: string;
  paddingBottom: string;
  color: string;
  backgroundColor: string;
  borderTopColor: string;
  borderTopWidth: string;
  borderTopStyle: string;
  borderRadius: string;
  boxShadow: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
};

const MAX_ELEMENTS = 360;
const VIEWPORT = { width: 1440, height: 1100 };
const LOCAL_BROWSER_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
];

export async function analyzeUrl(url: string) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Ingresa una URL valida con formato http o https.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Solo se aceptan URLs http o https.");
  }

  const browser = await chromium.launch({
    headless: true,
    ...(await resolveChromiumLaunchOptions())
  });

  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(parsedUrl.toString(), {
      waitUntil: "domcontentloaded",
      timeout: 25000
    });

    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => undefined);

    const raw = await page.evaluate((maxElements) => {
      const isVisible = (element: Element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);

        return (
          rect.width >= 8 &&
          rect.height >= 8 &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0
        );
      };

      const getRole = (element: Element, tag: string) => {
        const explicitRole = element.getAttribute("role");
        if (explicitRole) return explicitRole;
        if (/^h[1-6]$/.test(tag)) return "heading";
        if (tag === "button" || tag === "a") return "button/link";
        if (tag === "input" || tag === "textarea" || tag === "select") return "input";
        if (tag === "section" || tag === "main" || tag === "header" || tag === "footer") {
          return "section";
        }
        return "content";
      };

      const elements = Array.from(document.body.querySelectorAll("*"))
        .filter(isVisible)
        .slice(0, maxElements)
        .map((element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          const tag = element.tagName.toLowerCase();

          return {
            tag,
            role: getRole(element, tag),
            text: (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            marginTop: style.marginTop,
            marginBottom: style.marginBottom,
            paddingTop: style.paddingTop,
            paddingBottom: style.paddingBottom,
            color: style.color,
            backgroundColor: style.backgroundColor,
            borderTopColor: style.borderTopColor,
            borderTopWidth: style.borderTopWidth,
            borderTopStyle: style.borderTopStyle,
            borderRadius: style.borderRadius,
            boxShadow: style.boxShadow,
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight
          };
        });

      return {
        title: document.title,
        elements
      };
    }, MAX_ELEMENTS);

    const analysis = normalizeAnalysis(parsedUrl.toString(), raw.title, raw.elements);

    return {
      analysis,
      markdown: createDesignMarkdown(analysis)
    };
  } finally {
    await browser.close();
  }
}

async function resolveChromiumLaunchOptions() {
  const serverlessChromium = await resolveServerlessChromium();
  if (serverlessChromium) return serverlessChromium;

  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    chromium.executablePath(),
    ...LOCAL_BROWSER_CANDIDATES
  ].filter(Boolean) as string[];

  const executablePath = candidates.find((candidate) => existsSync(candidate));
  if (executablePath) return { executablePath };

  if (process.platform === "linux") {
    const bundledChromium = await resolveBundledChromium();
    if (bundledChromium) return bundledChromium;
  }

  throw new Error(
    "No se encontro un navegador Chromium disponible. En desarrollo ejecuta `npx playwright install chromium` o define PLAYWRIGHT_CHROMIUM_EXECUTABLE."
  );
}

async function resolveServerlessChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || process.platform === "win32") return null;

  const isServerless =
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NETLIFY ||
    process.env.PLAYWRIGHT_FORCE_SERVERLESS_CHROMIUM === "1";

  if (!isServerless) return null;

  return resolveBundledChromium();
}

async function resolveBundledChromium() {
  const serverlessChromium = (await import("@sparticuz/chromium")).default;

  return {
    args: serverlessChromium.args,
    executablePath: await serverlessChromium.executablePath()
  };
}

function normalizeAnalysis(url: string, title: string, elements: RawElement[]): DesignAnalysis {
  return {
    url,
    analyzedAt: new Date().toISOString(),
    title,
    colors: extractColors(elements),
    typography: extractTypography(elements),
    shapes: extractShapes(elements),
    layout: {
      maxWidth: Math.max(...elements.map((element) => element.width), 0),
      viewport: `${VIEWPORT.width}x${VIEWPORT.height}`,
      spacingScale: extractSpacing(elements),
      notes: createLayoutNotes(elements)
    }
  };
}

function extractColors(elements: RawElement[]): ColorToken[] {
  const colors = new Map<string, ColorToken>();

  for (const element of elements) {
    addColor(colors, element.color, "texto");
    addColor(colors, element.backgroundColor, "fondo");
    addColor(colors, element.borderTopColor, "borde");

    for (const shadowColor of element.boxShadow.match(/rgba?\([^)]+\)/g) || []) {
      addColor(colors, shadowColor, "sombra");
    }
  }

  return Array.from(colors.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 14);
}

function addColor(colors: Map<string, ColorToken>, rawColor: string, source: string) {
  const hex = toHex(rawColor);
  if (!hex) return;

  const existing = colors.get(hex);
  if (existing) {
    existing.count += 1;
    if (!existing.sources.includes(source)) existing.sources.push(source);
    return;
  }

  colors.set(hex, {
    value: rawColor,
    hex,
    count: 1,
    sources: [source]
  });
}

function toHex(rawColor: string) {
  const match = rawColor.match(/rgba?\(([^)]+)\)/);
  if (!match || rawColor === "transparent") return null;

  const [r, g, b, alpha = "1"] = match[1].split(",").map((part) => part.trim());
  if (Number(alpha) === 0) return null;

  const channels = [r, g, b].map((channel) => {
    const value = Math.max(0, Math.min(255, Number.parseInt(channel, 10)));
    return value.toString(16).padStart(2, "0");
  });

  if (channels.some((channel) => channel === "NaN")) return null;

  return `#${channels.join("")}`.toUpperCase();
}

function extractTypography(elements: RawElement[]): TypographyToken[] {
  const fonts = new Map<string, TypographyToken>();

  for (const element of elements) {
    const family = simplifyFontFamily(element.fontFamily);
    const existing = fonts.get(family);
    const role = element.role === "heading" ? `${element.tag}` : element.role;

    if (existing) {
      existing.count += 1;
      addUnique(existing.sizes, element.fontSize, 6);
      addUnique(existing.weights, element.fontWeight, 6);
      addUnique(existing.roles, role, 8);
      continue;
    }

    fonts.set(family, {
      family,
      count: 1,
      sizes: [element.fontSize],
      weights: [element.fontWeight],
      roles: [role]
    });
  }

  return Array.from(fonts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function simplifyFontFamily(fontFamily: string) {
  return fontFamily
    .split(",")
    .map((font) => font.trim().replace(/^["']|["']$/g, ""))
    .slice(0, 3)
    .join(", ");
}

function extractShapes(elements: RawElement[]): ShapeToken[] {
  const shapes = new Map<string, ShapeToken>();

  for (const element of elements) {
    if (!isShapeCandidate(element)) continue;

    const radius = normalizeZero(element.borderRadius);
    const border = `${normalizeZero(element.borderTopWidth)} ${element.borderTopStyle}`;
    const shadow = element.boxShadow === "none" ? "none" : compressShadow(element.boxShadow);
    const kind = classifyShape(element);
    const key = `${kind}|${radius}|${border}|${shadow}`;
    const sample = element.text || `${element.tag} ${element.width}x${element.height}`;
    const existing = shapes.get(key);

    if (existing) {
      existing.count += 1;
      continue;
    }

    shapes.set(key, {
      kind,
      count: 1,
      radius,
      border,
      shadow,
      sample
    });
  }

  return Array.from(shapes.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

function isShapeCandidate(element: RawElement) {
  return (
    element.role !== "content" ||
    element.borderRadius !== "0px" ||
    element.boxShadow !== "none" ||
    element.borderTopWidth !== "0px" ||
    element.width > 180
  );
}

function classifyShape(element: RawElement) {
  if (element.role === "button/link") return "Boton o enlace";
  if (element.role === "input") return "Campo de formulario";
  if (element.role === "section") return "Seccion";
  if (element.boxShadow !== "none" || Number.parseInt(element.borderRadius, 10) >= 8) return "Tarjeta";
  if (element.width > 500 && element.height > 120) return "Contenedor amplio";
  return "Elemento visual";
}

function normalizeZero(value: string) {
  return value === "0px" ? "0" : value;
}

function compressShadow(shadow: string) {
  return shadow.length > 80 ? `${shadow.slice(0, 77)}...` : shadow;
}

function extractSpacing(elements: RawElement[]) {
  const values = new Map<string, number>();

  for (const element of elements) {
    for (const value of [
      element.marginTop,
      element.marginBottom,
      element.paddingTop,
      element.paddingBottom
    ]) {
      if (value === "0px") continue;
      values.set(value, (values.get(value) || 0) + 1);
    }
  }

  return Array.from(values.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([value]) => value);
}

function createLayoutNotes(elements: RawElement[]) {
  const headings = elements.filter((element) => element.role === "heading").length;
  const buttons = elements.filter((element) => element.role === "button/link").length;
  const cards = elements.filter(
    (element) => element.boxShadow !== "none" || Number.parseInt(element.borderRadius, 10) >= 8
  ).length;

  return [
    `Se detectaron ${headings} encabezados visibles.`,
    `Se detectaron ${buttons} botones o enlaces accionables.`,
    `Se detectaron ${cards} elementos con radios marcados o sombras.`
  ];
}

function addUnique(items: string[], value: string, limit: number) {
  if (items.includes(value) || items.length >= limit) return;
  items.push(value);
}
