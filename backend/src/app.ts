import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { registerSwagger } from './plugins/swagger.js';
import authPlugin from './plugins/auth.js';
import { AppError, fail } from './utils/http.js';
import { authRoutes } from './routes/auth.js';
import { profileRoutes } from './routes/profile.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { userRoutes } from './routes/users.js';
import { departmentRoutes } from './routes/departments.js';
import { roleRoutes } from './routes/roles.js';
import { menuRoutes } from './routes/menus.js';
import { noticeRoutes } from './routes/notices.js';
import { logRoutes } from './routes/logs.js';
import { auditRoutes } from './routes/audits.js';
import { settingRoutes } from './routes/settings.js';
import { config } from './config.js';

export async function createApp() {
  const app = Fastify({
    logger: {
      level: 'info',
      transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty', options: { translateTime: 'SYS:standard', ignore: 'pid,hostname' } } : undefined
    }
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: [config.frontendOrigin, 'http://127.0.0.1:3000'],
    credentials: true
  });
  await registerSwagger(app);
  await app.register(authPlugin);

  app.setErrorHandler((error, request, reply) => {
    const appError = error as AppError;
    const statusCode = appError.statusCode || 500;
    const message = statusCode >= 500 ? '系统内部错误' : appError.message || '请求失败';
    request.log.error({ err: error, statusCode }, message);
    reply.status(statusCode).send(fail(message, statusCode));
  });

  app.get('/api/health', { config: { public: true } }, async () => ({ code: 200, message: 'ok', data: { status: 'up' } }));

  await app.register(async (protectedApp) => {
    await protectedApp.register(authRoutes, { prefix: '/api' });
    await protectedApp.register(profileRoutes, { prefix: '/api' });
    await protectedApp.register(dashboardRoutes, { prefix: '/api' });
    await protectedApp.register(userRoutes, { prefix: '/api' });
    await protectedApp.register(departmentRoutes, { prefix: '/api' });
    await protectedApp.register(roleRoutes, { prefix: '/api' });
    await protectedApp.register(menuRoutes, { prefix: '/api' });
    await protectedApp.register(noticeRoutes, { prefix: '/api' });
    await protectedApp.register(logRoutes, { prefix: '/api' });
    await protectedApp.register(auditRoutes, { prefix: '/api' });
    await protectedApp.register(settingRoutes, { prefix: '/api' });
  });

  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('x-app-name', 'enterprise-ops-workbench');
    return payload;
  });

  return app;
}
