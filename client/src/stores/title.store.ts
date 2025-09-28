import { create } from 'zustand';

interface TitleState {
  title: string;
  setTitle: (title: string) => void;
}

export const useTitleStore = create<TitleState>((set) => ({
  title: 'Purr',
  setTitle: (title: string) => set({ title }),
}));
