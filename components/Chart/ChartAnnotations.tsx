"use client";

// ChartAnnotations component - utility for annotation management
// Annotations are applied directly in ChartContainer via applyChartAction

import { ChartAction } from "@/types";

export interface AnnotationProps {
  actions: ChartAction[];
}

// This component is a placeholder for future standalone annotation UI
// Actual annotation rendering is handled in ChartContainer.tsx
export default function ChartAnnotations({ actions }: AnnotationProps) {
  if (actions.length === 0) return null;

  return (
    <div className="absolute bottom-2 right-2 z-10 flex flex-col gap-1">
      {actions.map((action, i) => (
        <div
          key={i}
          className="text-xs bg-bg-card/80 border border-border rounded px-2 py-0.5 text-text-muted font-mono"
        >
          {action.type === "horizontal_line" && `HL: ${action.params.price?.toFixed(2)}`}
          {action.type === "marker" && `Marker: ${action.params.text}`}
          {action.type === "clear" && "Cleared"}
        </div>
      ))}
    </div>
  );
}
