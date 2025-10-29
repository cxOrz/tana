import { ref } from 'vue';

export function usePreferredColorScheme() {
  const target = document.documentElement;
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = ref(mediaQuery.matches);

  const apply = (value: boolean) => {
    isDark.value = value;
    target.classList.toggle('dark', value);
  };

  apply(mediaQuery.matches);

  const handleChange = (event: MediaQueryListEvent) => apply(event.matches);
  mediaQuery.addEventListener('change', handleChange);

  const stop = () => {
    mediaQuery.removeEventListener('change', handleChange);
  };

  return {
    isDark,
    stop
  };
}
