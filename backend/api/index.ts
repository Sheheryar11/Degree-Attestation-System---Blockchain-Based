import serverlessHttp from 'serverless-http';
import type { Handler } from 'serverless-http';
import { createApp } from '../src/create-app';

let cachedHandler: Handler | null = null;

async function getHandler(): Promise<Handler> {
  if (!cachedHandler) {
    const app = await createApp();
    await app.init();
    cachedHandler = serverlessHttp(app.getHttpAdapter().getInstance());
  }
  return cachedHandler;
}

export default async function handler(req: unknown, res: unknown) {
  const h = await getHandler();
  return h(req as never, res as never);
}
