"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Project } from "@/types/calls";

interface ProjectContextValue {
  projects: Project[];
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  queryParam: string;
}

const ProjectContext = createContext<ProjectContextValue>({
  projects: [],
  selectedProjectId: null,
  setSelectedProjectId: () => {},
  queryParam: "",
});

export function ProjectProvider({ projects, children }: { projects: Project[]; children: ReactNode }) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const queryParam = selectedProjectId ? `?project_id=${selectedProjectId}` : "";

  return (
    <ProjectContext.Provider value={{ projects, selectedProjectId, setSelectedProjectId, queryParam }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}
