import { RequestHandler } from 'express';
import helmet from 'helmet';

// Applied globally in index.ts via app.use(helmet()).
// This export is available for targeted use on specific routers if needed.
export const secureHeaders: RequestHandler = helmet({
  contentSecurityPolicy: false, // API-only server — no HTML content
  crossOriginEmbedderPolicy: false,
});
