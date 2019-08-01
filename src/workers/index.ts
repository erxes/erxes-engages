import * as dotenv from 'dotenv';
import * as path from 'path';
import { Stats } from '../models';
import { debugWorkers } from '../debuggers';
import { createWorkers, splitToCore } from './utils';

dotenv.config();

export const receiveMessage = async ({ data }) => {
  debugWorkers('receiveMessage:', data);

  const { user, email, engageMessageId, customers } = data;

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

  await Stats.create({ engageMessageId });

  await createWorkers(workerPath, workerData, results);

  return true;
};