<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import type { ButtonVariants } from '.';
import { Primitive } from 'reka-ui';
import { cn } from '@/lib/utils';
import { buttonVariants } from '.';

/**
 * @file Button.vue
 * @description
 * 一个通用的、可定制的按钮组件。
 * 基于 Reka UI 的 Primitive 组件构建，并使用 tailwind-variants 进行样式变体管理。
 */

/**
 * @typedef {object} Props
 * @property {ButtonVariants['variant']} [variant='default'] - 按钮的样式变体。
 * @property {ButtonVariants['size']} [size='default'] - 按钮的尺寸。
 * @property {string} [class] - 自定义的 CSS 类。
 * @property {string} [as='button'] - 渲染的 HTML 元素标签。
 */
interface Props extends PrimitiveProps {
  variant?: ButtonVariants['variant'];
  size?: ButtonVariants['size'];
  class?: HTMLAttributes['class'];
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
});
</script>

<template>
  <Primitive
    data-slot="button"
    :as="as"
    :as-child="asChild"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <slot />
  </Primitive>
</template>
