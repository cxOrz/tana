declare global {
  import type { ReminderPayload } from '../shared';

  interface Window {
    electronAPI: {
      executeCommand: (command: string) => Promise<any>;
      onReminder: (callback: (payload: ReminderPayload) => void) => () => void;
    };
  }
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>;
  export default component;
}

export { };
