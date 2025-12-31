import { app } from 'electron';
import { promises as fs, readFileSync } from 'fs';
import { join } from 'path';

// =============================================================================
// Types & Constants
// =============================================================================

type WindowBoundsState = { x: number; y: number; width: number; height: number };

export type RuntimeState = {
  mainWindow?: WindowBoundsState;
};

const STATE_DIR_NAME = 'tana';
const STATE_FILE_NAME = 'runtime-state.json';

// =============================================================================
// Path Helpers
// =============================================================================

const resolveStateFilePath = (): string => {
  return join(app.getPath('userData'), STATE_DIR_NAME, STATE_FILE_NAME);
};

const ensureStateDir = async (): Promise<void> => {
  const dir = join(app.getPath('userData'), STATE_DIR_NAME);
  await fs.mkdir(dir, { recursive: true });
};

// =============================================================================
// Public API
// =============================================================================

/**
 * 读取运行时状态文件，容错并过滤非法值。
 */
export function loadRuntimeStateSync(): RuntimeState {
  const filePath = resolveStateFilePath();
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as RuntimeState;
    return {
      mainWindow: sanitizeBounds(parsed.mainWindow),
    };
  } catch {
    return {};
  }
}

/**
 * 持久化主窗口的位置和尺寸。
 */
export async function saveMainWindowBounds(bounds: WindowBoundsState): Promise<void> {
  const nextState: RuntimeState = {
    ...loadRuntimeStateSync(),
    mainWindow: sanitizeBounds(bounds),
  };

  if (!nextState.mainWindow) return;

  await ensureStateDir();
  const filePath = resolveStateFilePath();
  await fs.writeFile(filePath, JSON.stringify(nextState, null, 2), 'utf-8');
}

// =============================================================================
// Helpers
// =============================================================================

const sanitizeBounds = (bounds?: WindowBoundsState): WindowBoundsState | undefined => {
  if (!bounds) return undefined;
  const { x, y, width, height } = bounds;
  const isValid =
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0;

  if (!isValid) return undefined;
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
};
