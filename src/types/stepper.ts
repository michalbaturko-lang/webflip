export type AnalysisStatus =
  | "pending"
  | "crawling"
  | "analyzing"
  | "generating"
  | "complete"
  | "error";

export interface StepperState {
  currentStep: number; // 1-4
  loadingSteps: boolean[];
  completedSteps: boolean[];
  errors: Record<number, string>;
}

export interface StepConfig {
  titleKey: string; // i18n key
  descKey: string;
  detailKey: string;
  icon: string; // lucide icon name
  color: string;
  gradient: string;
}

/** Map API analysis status to a stepper step number (1-4). */
export function statusToStep(status: AnalysisStatus): number {
  switch (status) {
    case "pending":
      return 1;
    case "crawling":
    case "analyzing":
      return 2;
    case "generating":
      return 3;
    case "complete":
      return 4;
    case "error":
      return -1;
  }
}
