"use client";

import { FormEvent, useMemo, useState } from "react";
import type { DesignAnalysis } from "@/lib/design-types";

type AnalyzeResponse =
  | {
      analysis: DesignAnalysis;
      markdown: string;
      error?: never;
    }
  | {
      error: string;
      analysis?: never;
      markdown?: never;
    };

export default function Home() {
  const [url, setUrl] = useState("");
  const [analysis, setAnalysis] = useState<DesignAnalysis | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const canDownload = Boolean(markdown && analysis);
  const fileName = useMemo(() => {
    if (!analysis) return "DESIGN.md";
    const host = new URL(analysis.url).hostname.replace(/^www\./, "");
    return `DESIGN-${host}.md`;
  }, [analysis]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setAnalysis(null);
    setMarkdown("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url })
      });

      const data = (await response.json()) as AnalyzeResponse;

      if ("error" in data) {
        throw new Error(data.error || "No se pudo analizar la URL.");
      }

      setAnalysis(data.analysis);
      setMarkdown(data.markdown);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Ocurrio un error inesperado.");
    } finally {
      setIsLoading(false);
    }
  }

  function downloadMarkdown() {
    if (!canDownload) return;

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }

  return (
    <main className="shell">
      <section className="intro">
        <div>
          <p className="eyebrow">Generador local</p>
          <h1>Extrae un sistema visual y crea DESIGN.md</h1>
        </div>
        <p>
          Pega una URL publica para detectar colores, tipografias, formas, espaciados y patrones
          visuales desde estilos computados en navegador.
        </p>
      </section>

      <form className="analyzer" onSubmit={handleSubmit}>
        <label htmlFor="url">URL del sitio</label>
        <div className="inputRow">
          <input
            id="url"
            name="url"
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={isLoading}
            required
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Analizando..." : "Analizar"}
          </button>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </form>

      {analysis ? (
        <section className="results">
          <div className="resultHeader">
            <div>
              <p className="eyebrow">Resultado</p>
              <h2>{analysis.title || analysis.url}</h2>
            </div>
            <button className="secondaryButton" type="button" onClick={downloadMarkdown}>
              Descargar DESIGN.md
            </button>
          </div>

          <div className="panel">
            <h3>Paleta principal</h3>
            <div className="palette">
              {analysis.colors.map((color) => (
                <div className="swatch" key={color.hex}>
                  <span style={{ backgroundColor: color.hex }} />
                  <strong>{color.hex}</strong>
                  <small>{color.count} usos</small>
                </div>
              ))}
            </div>
          </div>

          <div className="grid">
            <div className="panel">
              <h3>Tipografias</h3>
              <div className="stack">
                {analysis.typography.map((font) => (
                  <article className="token" key={font.family}>
                    <strong>{font.family}</strong>
                    <span>{font.sizes.join(", ")}</span>
                    <small>Pesos: {font.weights.join(", ")} · Roles: {font.roles.join(", ")}</small>
                  </article>
                ))}
              </div>
            </div>

            <div className="panel">
              <h3>Formas</h3>
              <div className="stack">
                {analysis.shapes.map((shape) => (
                  <article className="shapeToken" key={`${shape.kind}-${shape.radius}-${shape.border}`}>
                    <div
                      aria-hidden="true"
                      style={{
                        borderRadius: shape.radius,
                        boxShadow: shape.shadow === "none" ? "none" : shape.shadow,
                        border: shape.border.startsWith("0") ? "1px solid #d8ded8" : shape.border
                      }}
                    />
                    <span>
                      <strong>{shape.kind}</strong>
                      <small>
                        Radio {shape.radius} · {shape.count} usos
                      </small>
                    </span>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="panel">
            <h3>Vista previa Markdown</h3>
            <pre>{markdown}</pre>
          </div>
        </section>
      ) : (
        <section className="emptyState">
          <span />
          <p>El resumen visual aparecera aqui despues del analisis.</p>
        </section>
      )}
    </main>
  );
}
