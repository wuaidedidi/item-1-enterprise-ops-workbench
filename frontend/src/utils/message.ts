import { ElMessage } from 'element-plus';

const recentMessages = new Set<string>();

export function showError(message: string) {
  if (recentMessages.has(message)) return;
  recentMessages.add(message);
  window.setTimeout(() => recentMessages.delete(message), 2000);
  ElMessage.error({ message, grouping: true, showClose: false });
}

export function showSuccess(message: string) {
  ElMessage.success({ message, grouping: true, showClose: false });
}

export function showInfo(message: string) {
  ElMessage.info({ message, grouping: true, showClose: false });
}
