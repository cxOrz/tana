// 项目中的共享常量，集中管理可以减少魔法字符串与重复定义。

export const IPC_CHANNELS = {
  // App lifecycle
  WILL_SHOW: 'app:will-show',
  WILL_HIDE: 'app:will-hide',
  HIDE_ACK: 'app:hide-ack',

  // Journal
  JOURNAL_ADD_ENTRY: 'journal:add-entry',
  JOURNAL_GET_DAY: 'journal:get-day',
  JOURNAL_LIST_DAYS: 'journal:list-days',
  JOURNAL_SET_SUMMARY: 'journal:set-summary',
  JOURNAL_OPEN_REPORT: 'journal:open-report',

  // Config & Resources
  APP_GET_CONFIG: 'app:get-config',
  APP_READ_FILE: 'app:read-file',
};

export const APP_USER_MODEL_ID = 'com.cxorz.tana'; // Windows 使用的用户模型 ID。
