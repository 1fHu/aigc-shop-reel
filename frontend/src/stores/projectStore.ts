import { create } from 'zustand';

// TODO: project state (list, current, CRUD actions)

interface ProjectState {
  projects: never[];
}

export const useProjectStore = create<ProjectState>(() => ({
  projects: [],
}));
