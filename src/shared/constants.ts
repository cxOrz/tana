/**
 * @file constants.ts
 * @description
 * 项目中共享的常量。
 * 将这些值集中管理可以提高代码的可维护性和一致性。
 */

/**
 * 宠物窗口的基础尺寸。
 * @property {number} WIDTH - 基础宽度。
 * @property {number} HEIGHT - 基础高度。
 */
export const PET_WINDOW_BASE_SIZE = {
  WIDTH: 450,
  HEIGHT: 360,
};

/**
 * Electron IPC 通道的名称。
 * 使用枚举或对象可以避免在代码中使用裸字符串，从而减少拼写错误。
 */
export const IPC_CHANNELS = {
  // App lifecycle
  WILL_SHOW: 'app:will-show',
  WILL_HIDE: 'app:will-hide',
  HIDE_ACK: 'app:hide-ack',

  // Reminders
  PUSH_REMINDER: 'reminder:push',

  // Notifications
  SHOW_SYSTEM_NOTIFICATION: 'notify:system',

  // Journal
  JOURNAL_ADD_ENTRY: 'journal:add-entry',
  JOURNAL_GET_DAY: 'journal:get-day',
  JOURNAL_LIST_DAYS: 'journal:list-days',
  JOURNAL_SET_SUMMARY: 'journal:set-summary',
  JOURNAL_OPEN_REPORT: 'journal:open-report',
};

/**
 * 应用程序的用户模型 ID (主要用于 Windows)。
 */
export const APP_USER_MODEL_ID = 'com.cxorz.tana';
