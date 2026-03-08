"use client";

import type React from "react";
import { ChevronRight } from "lucide-react";
import clsx from "clsx";

export interface AccordionSection {
  key: string;
  label: string;
  icon: React.ReactNode;
  accent: string;
  content: React.ReactNode;
}

interface Props {
  sections: AccordionSection[];
  openKey: string | null;
  onToggle: (key: string) => void;
}

export default function RightAccordion({ sections, openKey, onToggle }: Props) {
  return (
    <>
      {sections.map((section) => {
        const isOpen = openKey === section.key;
        return (
          <div
            key={section.key}
            className={clsx("flex flex-col border-b border-border", isOpen ? "flex-1 min-h-0" : "flex-none")}
          >
            <button
              onClick={() => onToggle(section.key)}
              className={clsx(
                "flex items-center justify-between px-3 py-2.5 hover:bg-bg-hover transition-colors w-full text-left flex-none",
                isOpen && "bg-bg-hover"
              )}
            >
              <div className={clsx("flex items-center gap-2", isOpen ? section.accent : "text-text-muted")}>
                {section.icon}
                <span className="text-xs font-semibold">{section.label}</span>
              </div>
              <ChevronRight
                size={13}
                className={clsx("text-text-muted flex-none transition-transform", isOpen && "rotate-90")}
              />
            </button>
            {isOpen && <div className="flex-1 overflow-hidden">{section.content}</div>}
          </div>
        );
      })}
      {openKey === null && <div className="flex-1" />}
    </>
  );
}
