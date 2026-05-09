export const storage = {
  get token() {
    return localStorage.getItem('eow-token') || '';
  },
  set token(value: string) {
    if (value) localStorage.setItem('eow-token', value);
    else localStorage.removeItem('eow-token');
  },
  get user() {
    const raw = localStorage.getItem('eow-user');
    return raw ? JSON.parse(raw) : null;
  },
  set user(value: any) {
    if (value) localStorage.setItem('eow-user', JSON.stringify(value));
    else localStorage.removeItem('eow-user');
  }
};
