import { create } from "zustand";

interface ModelResultStore {

  modelResult: any;

  setModelResult: (
    result: any
  ) => void;
}

export const useModelResultStore =
  create<ModelResultStore>((set) => ({

    modelResult: null,

    setModelResult: (
      result
    ) =>
      set({
        modelResult: result,
      }),
  }));