import { create } from 'zustand';
import type { ProjectListItem } from '@/types';

interface ProjectState {
  projects: ProjectListItem[];
}

export const useProjectStore = create<ProjectState>(() => ({
  projects: [],
}));
