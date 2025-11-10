declare global {
  import type { ReminderPayload } from '../shared';
  import type { AppConfig } from '../shared';

  interface Window {
    electronAPI: {
      executeCommand: (command: string) => Promise<any>;
      loadAppConfig: () => Promise<AppConfig>;
      saveAppConfig: (config: AppConfig) => Promise<AppConfig>;
      openConfigWindow: () => Promise<void>;
      onReminder: (callback: (payload: ReminderPayload) => void) => () => void;
      onAppWillHide: (callback: () => void) => () => void;
      onAppWillShow: (callback: () => void) => () => void;
      notifyHideReady: () => void;
      notifySystem: (payload: ReminderPayload) => Promise<void>;
    };
  }
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>;
  export default component;
}

export {};
