// ── PostMessage types for iframe ↔ parent communication ──────────────

export interface ElementInfo {
  tag: string;
  cssPath: string;
  boundingRect: { top: number; left: number; width: number; height: number };
  textContent: string;
  outerHTML: string;
  computedStyles: Record<string, string>;
  isImage: boolean;
  imgSrc?: string;
  parentTag?: string;
}

// Messages FROM iframe → parent
export type EditorMessage =
  | { type: "wf-hover"; element: ElementInfo | null }
  | { type: "wf-select"; element: ElementInfo }
  | { type: "wf-deselect" }
  | { type: "wf-text-edit"; cssPath: string; oldText: string; newText: string; newHtml: string }
  | { type: "wf-delete"; cssPath: string }
  | { type: "wf-html-update"; html: string }
  | { type: "wf-ready" };

// Commands FROM parent → iframe
export type ParentCommand =
  | { type: "wf-cmd-select"; cssPath: string }
  | { type: "wf-cmd-style"; cssPath: string; property: string; value: string }
  | { type: "wf-cmd-delete"; cssPath: string }
  | { type: "wf-cmd-set-mode"; mode: "browse" | "select" | "edit" }
  | { type: "wf-cmd-get-html" }
  | { type: "wf-cmd-replace-element"; cssPath: string; newHtml: string }
  | { type: "wf-cmd-text-edit"; cssPath: string; enable: boolean }
  | { type: "wf-cmd-reorder-section"; fromIndex: number; toIndex: number };

export type EditorMode = "browse" | "select" | "edit";

export const EDITABLE_TAGS = new Set([
  "H1", "H2", "H3", "H4", "H5", "H6",
  "P", "SPAN", "A", "BUTTON", "LI", "TD", "TH",
  "IMG", "DIV", "SECTION", "NAV", "FOOTER", "HEADER",
  "FIGURE", "BLOCKQUOTE", "LABEL", "INPUT",
]);

export const TEXT_EDITABLE_TAGS = new Set([
  "H1", "H2", "H3", "H4", "H5", "H6",
  "P", "SPAN", "A", "BUTTON", "LI", "TD", "TH",
  "LABEL", "BLOCKQUOTE",
]);
