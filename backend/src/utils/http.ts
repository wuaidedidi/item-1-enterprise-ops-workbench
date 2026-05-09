export class AppError extends Error {
  statusCode: number;
  code: number;

  constructor(message: string, statusCode = 400, code = statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const ok = <T>(data: T, message = '操作成功') => ({
  code: 200,
  message,
  data
});

export const fail = (message: string, code = 500, data: null = null) => ({
  code,
  message,
  data
});
