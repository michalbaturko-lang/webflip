/**
 * Shared types for the variant comparison system.
 * Single source of truth — import from here, do not duplicate.
 */

export interface DesignVariant {
  name: string;
  description: string;
  palette: DesignPalette;
  typography: DesignTypography;
  layout: string;
  keyFeatures: string[];
}

export interface DesignPalette {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  text: string;
}

export interface DesignTypography {
  heading: string;
  body: string;
}

export type ViewMode = "desktop" | "mobile";

export interface RecommendationResponse {
  recommendedIndex: number;
  templateName: string;
  reasonKey: string;
  confidence: number;
}

export interface RemixRequest {
  layout?: number;
  colors?: number;
  typography?: number;
}

export interface RemixResponse {
  html: string;
  variantIndex: number;
  sources: {
    layout: number;
    colors: number;
    typography: number;
  };
}

export interface RemixErrorResponse {
  error: string;
}
