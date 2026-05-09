import 'dotenv/config';
import path from 'node:path';
import crypto from 'node:crypto';

export const config = {
  port: Number(process.env.PORT || 8000),
  host: process.env.HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || crypto.randomUUID(),
  dbFile: process.env.DB_FILE || path.resolve(process.cwd(), 'data', 'app.db'),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000'
};
