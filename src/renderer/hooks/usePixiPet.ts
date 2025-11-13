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
 */

/**
 * @interface UsePixiPetResult
 * @description `usePixiPet` hook 的返回值类型。
 * @property {Ref<number>} uiScale - UI 元素的响应式缩放比例。
 */
export interface UsePixiPetResult {
  uiScale: Ref<number>;
}

/**
 * 加载史莱姆的 spritesheet。
 * @returns {Promise<Spritesheet>}
 */
async function loadSlimeSpritesheet(): Promise<Spritesheet> {
  const texture = await Assets.load<Texture>(slimeTextureUrl);
  const sheet = new Spritesheet(texture, slimeSheetData as SpritesheetData);
  await sheet.parse();
  return sheet;
}

/**
 * 管理 Pixi.js 宠物的渲染和动画。
 * @param {Ref<HTMLDivElement | null>} pixiContainer - 用于挂载 canvas 的 DOM 元素。
 * @returns {UsePixiPetResult}
 */
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

    const spritesheet = await loadSlimeSpritesheet();

    if (disposed || !app) {
      return;
    }

    const frames = Object.values(spritesheet.textures);
    const slime = new AnimatedSprite(frames);
    slime.anchor.set(0.5);

    const applyLayout = () => {
      if (!app) return;
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
