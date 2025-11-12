import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';

export { default as Button } from './Button.vue';

/**
 * @file index.ts
 * @description
 * 定义按钮组件的样式变体。
 * 使用 `class-variance-authority` (cva) 来管理不同外观和尺寸的 CSS 类。
 */

/**
 * `cva` 函数生成的按钮样式配置。
 * @property {object} variants - 包含 `variant` 和 `size` 两种变体。
 * @property {object} defaultVariants - 默认的变体配置。
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      /**
       * @name variant
       * @description 按钮的视觉样式。
       * @enum {string}
       * @property {string} default - 默认样式，用于主要操作。
       * @property {string} destructive - 危险操作样式，通常为红色。
       * @property {string} outline - 轮廓样式，用于次要操作。
       * @property {string} secondary - 次要样式，视觉层次低于默认按钮。
       * @property {string} ghost - 幽灵样式，无背景，仅在悬停时有背景色。
       * @property {string} link - 链接样式，看起来像一个链接。
       */
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        destructive:
          'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      /**
       * @name size
       * @description 按钮的尺寸。
       * @enum {string}
       * @property {string} default - 默认尺寸。
       * @property {string} sm - 小尺寸。
       * @property {string} lg - 大尺寸。
       * @property {string} icon - 图标按钮尺寸。
       * @property {string} icon-sm - 小号图标按钮尺寸。
       * @property {string} icon-lg - 大号图标按钮尺寸。
       */
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

/**
 * 从 `buttonVariants` 推断出的 TypeScript 类型，用于在组件中提供类型提示。
 * @typedef {object} ButtonVariants
 * @property {('default'|'destructive'|'outline'|'secondary'|'ghost'|'link')} [variant] - 按钮的样式变体。
 * @property {('default'|'sm'|'lg'|'icon'|'icon-sm'|'icon-lg')} [size] - 按钮的尺寸。
 */
export type ButtonVariants = VariantProps<typeof buttonVariants>;
