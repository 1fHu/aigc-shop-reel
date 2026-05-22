import { create } from 'zustand';

// TODO: script state (current script, storyboard, factor history)

interface ScriptState {
  script: null;
}

export const useScriptStore = create<ScriptState>(() => ({
  script: null,
}));
