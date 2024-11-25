export const enum EventName {
  CONNECT_WS_SYSTEM = 'connect_ws_system',
  DISCONNECT_WS_SYSTEM = 'disconnect_ws_system',
  FLUSH_NOTICE_UNREAD_COUNT = 'flush_notice_unread_count',
  RECEIVE_CHAT_MESSAGE = 'receive_chat_message',
  SEND_CHAT_MESSAGE = 'send_chat_message',
  RESEND_CHAT_MESSAGE = 'resend_chat_message',
  INSERT_TEMP_MESSAGE = 'insert_temp_message',
  UPDATE_TEMP_MESSAGE = 'update_temp_message',
  CHANGE_CURRENT_CONVERSATION = 'change_current_conversation',
  START_CHAT_WITH_USER = 'start_chat_with_user',
  START_CONVERSATION_CHANGE_TO_CONTACT = 'start_conversation_change_to_contact',
  FLUSH_FRIEND_LIST = 'flush_friend_list',
  FLUSH_FRIEND_APPLY_LIST = 'flush_friend_apply_list',
  FLUSH_GROUP_LIST = 'flush_group_list',
  FLUSH_BLACKLIST = 'flush_blacklist',
}