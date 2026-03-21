import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { router } from './router';
import { runMigrations } from './db/migrate';

const PORT = process.env.PORT ?? 3001;

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  }),
);
app.use(express.json());
app.use('/api', router);

runMigrations();

app.listen(PORT, () => {
  console.log(`[RapidX] Server running on http://localhost:${PORT}`);
});
