export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  status: "pending" | "success" | "error" | "upsell";
  errorMessage?: string;
}

export interface Snapshot {
  id: string;
  html: string;
  label: string;
  timestamp: Date;
}

export interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  lineNum: number;
}

export interface InlineEditMessage {
  type: "webflipper-inline-edit";
  selector: string;
  text: string;
  rect: { left: number; top: number; width: number; height: number };
}

export interface EditApiResponse {
  success?: boolean;
  html?: string;
  error?: string;
  message?: string;
  upsell?: boolean;
}
