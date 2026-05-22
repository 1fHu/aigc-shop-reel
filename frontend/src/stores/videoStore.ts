import { create } from 'zustand';

// TODO: video state (generation progress, shot statuses, result)

interface VideoState {
  tasks: never[];
}

export const useVideoStore = create<VideoState>(() => ({
  tasks: [],
}));
