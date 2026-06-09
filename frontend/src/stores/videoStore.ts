import { create } from 'zustand';
import type { VideoTask } from '@/types';

interface VideoState {
  tasks: VideoTask[];
}

export const useVideoStore = create<VideoState>(() => ({
  tasks: [],
}));
