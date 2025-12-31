import { describe, it, expect, vi } from 'vitest';
import { calculateWorkdayProgress } from './utils';

// 模拟 electron 模块，防止导入 utils.ts 时报错
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
  },
}));

describe('calculateWorkdayProgress', () => {
  const workDayConfig = {
    startTime: '09:00',
    endTime: '18:00',
  };

  it('should return 0 before work starts', () => {
    // 2025-01-01 08:00:00
    const now = new Date(2025, 0, 1, 8, 0, 0).getTime();
    const progress = calculateWorkdayProgress(workDayConfig, now);
    expect(progress).toBe(0);
  });

  it('should return 0.5 at the middle of the workday', () => {
    // 2025-01-01 13:30:00 (09:00 to 18:00 is 9 hours, 4.5 hours passed is 13:30)
    const now = new Date(2025, 0, 1, 13, 30, 0).getTime();
    const progress = calculateWorkdayProgress(workDayConfig, now);
    expect(progress).toBe(0.5);
  });

  it('should return 1 after work ends', () => {
    // 2025-01-01 19:00:00
    const now = new Date(2025, 0, 1, 19, 0, 0).getTime();
    const progress = calculateWorkdayProgress(workDayConfig, now);
    expect(progress).toBe(1);
  });

  it('should return 0 if workDayConfig is missing', () => {
    const progress = calculateWorkdayProgress(undefined, Date.now());
    expect(progress).toBe(0);
  });

  it('should handle invalid time range (end before start)', () => {
    const invalidConfig = {
      startTime: '18:00',
      endTime: '09:00',
    };
    const now = new Date(2025, 0, 1, 12, 0, 0).getTime();
    const progress = calculateWorkdayProgress(invalidConfig, now);
    expect(progress).toBe(0);
  });
});
