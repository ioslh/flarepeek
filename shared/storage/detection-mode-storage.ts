import { storage } from 'wxt/utils/storage';

// Local only, same rationale as every other item in this directory. A
// single global switch — not per-tab — since it governs how the *dynamic*
// tab (there's only ever one) behaves; see
// entrypoints/sidepanel/tabs/panel-tab-pane.tsx.
const manualDetectionItem = storage.defineItem<boolean>('local:manualDetectionEnabled', {
  fallback: false,
});

export async function getManualDetectionEnabled(): Promise<boolean> {
  return (await manualDetectionItem.getValue()) ?? false;
}

export async function setManualDetectionEnabled(value: boolean): Promise<void> {
  await manualDetectionItem.setValue(value);
}

export function watchManualDetectionEnabled(callback: (value: boolean) => void): () => void {
  return manualDetectionItem.watch((value) => callback(value ?? false));
}
