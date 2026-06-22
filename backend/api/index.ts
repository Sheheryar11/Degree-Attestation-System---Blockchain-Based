import type { Request, Response } from 'express';
import { createApp } from '../src/create-app';

let cachedExpressApp: ((req: Request, res: Response) => void) | null = null;

async function getExpressApp() {
  if (!cachedExpressApp) {
    const app = await createApp();
    await app.init();
    cachedExpressApp = app.getHttpAdapter().getInstance();
  }
  return cachedExpressApp;
}

export default async function handler(req: unknown, res: unknown) {
  const expressApp = await getExpressApp();
  expressApp(req as Request, res as Response);
}
