/**
 * Shared chart color tokens.
 */

export const CHART_COLORS = {
  primary: {
    stroke: "oklch(0.55 0.24 264)",
    fill: "oklch(0.55 0.24 264 / 0.2)",
    subtleFill: "oklch(0.55 0.24 264 / 0.15)",
  },
  profit: {
    stroke: "oklch(0.65 0.2 145)",
    fill: "oklch(0.65 0.2 145 / 0.2)",
    subtleFill: "oklch(0.65 0.2 145 / 0.15)",
  },
  loss: {
    stroke: "oklch(0.65 0.2 25)",
    fill: "oklch(0.65 0.2 25 / 0.2)",
    subtleFill: "oklch(0.65 0.2 25 / 0.15)",
  },
  neutral: {
    stroke: "oklch(0.65 0.02 260)",
    fill: "oklch(0.65 0.02 260 / 0.15)",
    solid: "oklch(0.4 0.02 260)",
  },
  accent: {
    stroke: "oklch(0.6 0.15 200)",
    fill: "oklch(0.6 0.15 200)",
  },
  warning: {
    stroke: "oklch(0.75 0.18 75)",
    fill: "oklch(0.75 0.18 75)",
  },
} as const;
