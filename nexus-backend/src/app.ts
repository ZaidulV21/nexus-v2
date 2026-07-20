import express, { Express, Request, Response } from 'express';
import path from 'path';
import { applySecurityMiddleware } from './core/middleware/security';
import { requestLogger } from './core/middleware/requestLogger';
import { errorHandler, notFoundHandler } from './core/middleware/errorHandler';
import { env } from './config/env';

import authRoutes from './modules/auth/auth.routes';
import categoryRoutes from './modules/catalog/category.routes';
import serviceRoutes from './modules/catalog/service.routes';
import leadRoutes from './modules/lead/lead.routes';
import clientRoutes from './modules/client/client.routes';
import quotationRoutes from './modules/quotation/quotation.routes';
import projectRoutes from './modules/project/project.routes';
import invoiceRoutes from './modules/invoice/invoice.routes';
import documentRoutes from './modules/documents/documents.routes';
import conversationRoutes from './modules/messages/conversation.routes';
import searchRoutes from './modules/search/search.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import timelineRoutes from './modules/timeline/timeline.routes';
import auditRoutes from './modules/audit/audit.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import companyRoutes from './modules/company/company.routes';

export function createApp(): Express {
  const app = express();

  applySecurityMiddleware(app);
  app.use(express.json());
  app.use(requestLogger);

  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { status: 'ok' } });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/services', serviceRoutes);
  app.use('/api/leads', leadRoutes);
  app.use('/api/clients', clientRoutes);
  app.use('/api/quotations', quotationRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/invoices', invoiceRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/conversations', conversationRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/timeline', timelineRoutes);
  app.use('/api/audit-logs', auditRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/company', companyRoutes);

  app.use('/uploads', express.static(path.resolve(env.localStoragePath)));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
