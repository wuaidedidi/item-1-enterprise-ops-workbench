import dayjs from 'dayjs';

export function formatTime(value?: number | string | null) {
  if (!value) return '-';
  return dayjs(Number(value)).format('YYYY-MM-DD HH:mm');
}

export function statusText(value?: string | null) {
  const map: Record<string, string> = {
    enabled: '启用',
    disabled: '停用',
    draft: '草稿',
    published: '已发布',
    unread: '未读',
    read: '已读',
    pending: '待处理',
    done: '已处理',
    low: '普通',
    normal: '常规',
    high: '重要'
  };
  return map[value || ''] || value || '-';
}

export function statusType(value?: string | null) {
  const map: Record<string, any> = {
    enabled: 'success',
    disabled: 'info',
    published: 'success',
    draft: 'warning',
    high: 'danger',
    normal: 'primary',
    low: 'info',
    read: 'success',
    unread: 'warning',
    done: 'success',
    pending: 'warning'
  };
  return map[value || ''] || 'info';
}
