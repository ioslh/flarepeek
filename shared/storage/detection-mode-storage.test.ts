import { describe, expect, it } from 'vitest';
import {
  getManualDetectionEnabled,
  setManualDetectionEnabled,
} from '@/shared/storage/detection-mode-storage';

describe('detection-mode-storage', () => {
  it('defaults to disabled', async () => {
    expect(await getManualDetectionEnabled()).toBe(false);
  });

  it('persists an enabled value', async () => {
    await setManualDetectionEnabled(true);
    expect(await getManualDetectionEnabled()).toBe(true);
  });

  it('persists a disabled value after being enabled', async () => {
    await setManualDetectionEnabled(true);
    await setManualDetectionEnabled(false);
    expect(await getManualDetectionEnabled()).toBe(false);
  });
});
