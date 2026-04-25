import type { DesignAnalysis } from "./design-types";

function list(items: string[]) {
  return items.length ? items.join("\n") : "- No detectado";
}

export function createDesignMarkdown(analysis: DesignAnalysis) {
  const colorLines = analysis.colors.map(
    (color) =>
      `- \`${color.hex}\` (${color.count} usos): ${color.sources.slice(0, 4).join(", ")}`
  );

  const typographyLines = analysis.typography.map(
    (font) =>
      `- **${font.family}** (${font.count} usos): tamanos ${font.sizes.join(", ") || "n/a"}; pesos ${
        font.weights.join(", ") || "n/a"
      }; roles ${font.roles.join(", ") || "general"}.`
  );

  const shapeLines = analysis.shapes.map(
    (shape) =>
      `- **${shape.kind}** (${shape.count}): radio \`${shape.radius}\`, borde \`${shape.border}\`, sombra \`${shape.shadow}\`. Ejemplo: ${shape.sample}.`
  );

  return `# DESIGN.md

## Fuente
- URL: ${analysis.url}
- Titulo: ${analysis.title || "Sin titulo detectado"}
- Fecha de analisis: ${analysis.analyzedAt}
- Viewport usado: ${analysis.layout.viewport}

## Paleta principal
${list(colorLines)}

## Tipografias
${list(typographyLines)}

## Formas y componentes
${list(shapeLines)}

## Layout observado
- Ancho maximo visible detectado: ${analysis.layout.maxWidth}px
- Escala de espaciado frecuente: ${analysis.layout.spacingScale.join(", ") || "No detectada"}
${list(analysis.layout.notes)}

## Recomendaciones para replicar el estilo
- Usa los colores con mayor frecuencia como base de fondo, texto y acciones principales.
- Mantiene las familias tipograficas dominantes para conservar el tono visual del sitio.
- Replica radios, bordes y sombras frecuentes antes de introducir variantes nuevas.
- Construye botones, tarjetas e inputs desde los patrones detectados en la seccion de formas.
- Valida el resultado contra una captura real del sitio original antes de cerrar el sistema visual.
`;
}
