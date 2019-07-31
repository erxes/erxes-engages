import * as bodyParser from 'body-parser';
import * as dotenv from 'dotenv';
import * as express from 'express';
import * as path from 'path';
import { connect } from '../connection';
import { Stats } from '../models';
import { debugRequest, debugWorkers } from '../utils/debuggers';
import { createWorkers, splitToCore } from './utils';

// load environment variables
dotenv.config();

// connect to mongo database
connect();

const app = express();

// for health check
app.get('/status', async (_req, res) => {
  res.end('ok');
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/send', async (req: any, res) => {
  const { user, email, engageMessageId, customers } = req.body;

  const results: string[] = splitToCore(customers);

  const workerFile =
    process.env.NODE_ENV === 'production'
      ? `./dist/workers/sendEmail.worker.js`
      : './src/workers/sendEmail.worker.import.js';

  const workerPath = path.resolve(workerFile);

  const workerData = {
    user,
    email,
    engageMessageId,
  };

  await Stats.create({ _id: engageMessageId });

  await createWorkers(workerPath, workerData, results);

  debugRequest(debugWorkers, req);

  return res.status(200).end();
});

// Error handling middleware
app.use((error, _req, res, _next) => {
  console.error(error.stack);
  res.status(500).send(error.message);
});

const { PORT_WORKERS } = process.env;

app.listen(PORT_WORKERS, () => {
  debugWorkers(`Workers server is now running on ${PORT_WORKERS}`);
});
