import { onMounted, onBeforeUnmount, type Ref } from 'vue';
import { Application, Assets, Spritesheet, AnimatedSprite } from 'pixi.js';
import type { SpritesheetData, Texture } from 'pixi.js';
import slimeSheetData from '../assets/slime/slime.json';
import slimeTextureUrl from '../assets/slime/slime.png';

/**
 * @file usePixiPet.ts
 * @description
 * 简化版的 Pixi.js 宠物渲染 Hook。
 * 负责加载资源（默认或自定义）并将其渲染到容器中，内容将直接填满容器。
 */

// =============================================================================
// Resource Loading
// =============================================================================

/**
 * 加载默认的史莱姆 AnimatedSprite。
 */
async function loadDefaultSlime(): Promise<AnimatedSprite> {
  const texture = await Assets.load<Texture>(slimeTextureUrl);
  const sheet = new Spritesheet(texture, slimeSheetData as SpritesheetData);
  await sheet.parse();
  const frames = Object.values(sheet.textures);
  return new AnimatedSprite(frames);
}

/**
 * 加载自定义资源。
 */
async function loadCustomTheme(theme: {
  type: 'image' | 'spritesheet';
  path: string;
}): Promise<AnimatedSprite | null> {
  try {
    if (theme.type === 'spritesheet') {
      const jsonB64 = await window.electronAPI.readResource(theme.path);
      const jsonStr = new TextDecoder().decode(
        Uint8Array.from(atob(jsonB64), (c) => c.charCodeAt(0))
      );
      const sheetData = JSON.parse(jsonStr);

      const separator = theme.path.includes('\\') ? '\\' : '/';
      const dir = theme.path.substring(0, theme.path.lastIndexOf(separator));
      const imageFilename = sheetData.meta.image;
      const imagePath = `${dir}${separator}${imageFilename}`;

      const imageB64 = await window.electronAPI.readResource(imagePath);
      const ext = imageFilename.split('.').pop()?.toLowerCase() || 'png';
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
      const texture = await Assets.load<Texture>(`data:${mime};base64,${imageB64}`);

      const sheet = new Spritesheet(texture, sheetData);
      await sheet.parse();
      const frames = Object.values(sheet.textures);
      return new AnimatedSprite(frames);
    } else if (theme.type === 'image') {
      const imageB64 = await window.electronAPI.readResource(theme.path);
      const ext = theme.path.split('.').pop()?.toLowerCase() || 'png';
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
      const texture = await Assets.load<Texture>(`data:${mime};base64,${imageB64}`);
      return new AnimatedSprite([texture]);
    }
  } catch (error) {
    console.error('Failed to load custom theme:', error);
    return null;
  }
  return null;
}

// =============================================================================
// Main Hook
// =============================================================================

export function usePixiPet(pixiContainer: Ref<HTMLDivElement | null>) {
  let app: Application | null = null;
  let sprite: AnimatedSprite | null = null;
  let disposed = false;

  // 简单布局：保持内容填满窗口
  const updateLayout = () => {
    if (!app || !sprite) return;
    sprite.position.set(app.screen.width / 2, app.screen.height / 2);
  };

  onMounted(async () => {
    // 1. 初始化 Pixi 应用
    const instance = new Application();
    await instance.init({
      backgroundAlpha: 0,
      resizeTo: window, // 自动跟随窗口大小
    });

    if (disposed || !pixiContainer.value) {
      instance.destroy();
      return;
    }

    pixiContainer.value.appendChild(instance.canvas);
    app = instance;
    instance.canvas.style.display = 'block';

    // 2. 加载资源 (优先配置，失败则回退默认)
    try {
      const config = await window.electronAPI.getAppConfig();
      const theme = config.mainWindow?.theme;

      if (theme?.custom && theme.path) {
        sprite = await loadCustomTheme(theme);
      }
    } catch (e) {
      console.warn('Config load failed or custom theme invalid, falling back.', e);
    }

    if (!sprite) {
      sprite = await loadDefaultSlime();
    }

    if (disposed || !app) {
      return;
    }

    // 3. 设置渲染属性
    sprite.anchor.set(0.5);
    sprite.animationSpeed = 0.03;
    sprite.play();
    app.stage.addChild(sprite);

    updateLayout();

    window.addEventListener('resize', updateLayout);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', updateLayout);
    disposed = true;
    if (app) {
      app.destroy(true, { children: true });
      app = null;
    }
  });
}
