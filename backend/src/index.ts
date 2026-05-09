import { config } from './config.js';
import { ensureDatabaseAndSeed } from './db/bootstrap.js';
import { createApp } from './app.js';

await ensureDatabaseAndSeed();

const app = await createApp();
await app.listen({ port: config.port, host: config.host });
