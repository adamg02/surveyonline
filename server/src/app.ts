import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { router as surveyRouter } from './routes/surveys';
import { router as responseRouter } from './routes/responses';
import { router as authRouter } from './routes/auth';

export const createApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRouter);
  app.use('/api/surveys', surveyRouter);
  app.use('/api/responses', responseRouter);
  return app;
};
