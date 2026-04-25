export type ColorToken = {
  value: string;
  hex: string;
  count: number;
  sources: string[];
};

export type TypographyToken = {
  family: string;
  count: number;
  sizes: string[];
  weights: string[];
  roles: string[];
};

export type ShapeToken = {
  kind: string;
  count: number;
  radius: string;
  border: string;
  shadow: string;
  sample: string;
};

export type DesignAnalysis = {
  url: string;
  analyzedAt: string;
  title: string;
  colors: ColorToken[];
  typography: TypographyToken[];
  shapes: ShapeToken[];
  layout: {
    maxWidth: number;
    viewport: string;
    spacingScale: string[];
    notes: string[];
  };
};
