import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue';
import { Application, Assets, Spritesheet, AnimatedSprite } from 'pixi.js';
import type { SpritesheetData, Texture } from 'pixi.js';
import { PET_WINDOW_BASE_SIZE } from '../../shared/constants';
import slimeSheetData from '../assets/slime/slime.json';
import slimeTextureUrl from '../assets/slime/slime.png';

/**
 * @file usePixiPet.ts
 * @description
 * 一个 Vue Composition API hook，用于封装 Pixi.js 宠物的渲染和动画逻辑。
 * 支持加载默认史莱姆或自定义配置的资源（图片/SpriteSheet）。
 */

// =============================================================================
// Types & Interfaces
// =============================================================================

export interface UsePixiPetResult {
  uiScale: Ref<number>;
}

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
 * @param theme 配置中的主题对象
 */
async function loadCustomTheme(theme: { type: 'image' | 'spritesheet'; path: string }): Promise<AnimatedSprite | null> {
  try {
    if (theme.type === 'spritesheet') {
      // 1. 读取 JSON 配置文件
      const jsonB64 = await window.electronAPI.readResource(theme.path);
      const jsonStr = new TextDecoder().decode(Uint8Array.from(atob(jsonB64), c => c.charCodeAt(0)));
      const sheetData = JSON.parse(jsonStr);

      // 2. 解析图片路径（假设图片在同一目录下）
      // 简单处理路径分隔符
      const separator = theme.path.includes('\\') ? '\\' : '/';
      const dir = theme.path.substring(0, theme.path.lastIndexOf(separator));
      const imageFilename = sheetData.meta.image;
      const imagePath = `${dir}${separator}${imageFilename}`;

      // 3. 读取图片资源
      const imageB64 = await window.electronAPI.readResource(imagePath);
      // 简单推断 mime type，默认为 png
      const ext = imageFilename.split('.').pop()?.toLowerCase() || 'png';
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
      const texture = await Assets.load<Texture>(`data:${mime};base64,${imageB64}`);

      // 4. 创建 Spritesheet
      const sheet = new Spritesheet(texture, sheetData);
      await sheet.parse();
      const frames = Object.values(sheet.textures);
      return new AnimatedSprite(frames);

    } else if (theme.type === 'image') {
      // 单张静态图
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

export function usePixiPet(pixiContainer: Ref<HTMLDivElement | null>): UsePixiPetResult {
  let app: Application | null = null;
  let disposed = false;
  const uiScale = ref(1);

  onMounted(async () => {
    const instance = new Application();
    await instance.init({
      backgroundAlpha: 0,
      resizeTo: window,
    });

    if (disposed || !pixiContainer.value) {
      instance.destroy();
      return;
    }

    pixiContainer.value.appendChild(instance.canvas);
    app = instance;
    instance.canvas.classList.add('w-full', 'h-full', 'block');

    let slime: AnimatedSprite | null = null;

    try {
      const config = await window.electronAPI.getAppConfig();
      const theme = config.mainWindow?.theme;

      if (theme?.custom && theme.path) {
        slime = await loadCustomTheme(theme);
      }
    } catch (e) {
      console.warn('Config load failed or custom theme invalid, falling back.', e);
    }

    if (!slime) {
      slime = await loadDefaultSlime();
    }

    if (disposed || !app) {
      return;
    }

    slime.anchor.set(0.5);

    const applyLayout = () => {
      if (!app || !slime) return;
      const scaleX = app.screen.width / PET_WINDOW_BASE_SIZE.WIDTH;
      const scaleY = app.screen.height / PET_WINDOW_BASE_SIZE.HEIGHT;
      const uniform = Math.min(scaleX, scaleY);
      slime.scale.set(uniform);
      slime.position.set(app.screen.width / 2, app.screen.height / 2);
      uiScale.value = Math.min(1, Math.max(0.7, uniform));
    };

    applyLayout();
    
    slime.animationSpeed = 0.03; 
    slime.play();

    app.stage.addChild(slime);

    const onResize = () => applyLayout();
    window.addEventListener('resize', onResize);

    onBeforeUnmount(() => {
      window.removeEventListener('resize', onResize);
    });
  });

  onBeforeUnmount(() => {
    disposed = true;
    if (app) {
      app.destroy(true, { children: true });
      app = null;
    }
  });

  return {
    uiScale,
  };
}