import * as amqplib from 'amqplib';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Stats } from '../models';
import { debugWorkers } from '../utils/debuggers';
import { createWorkers, splitToCore } from './utils';

dotenv.config();

const { RABBITMQ_HOST = 'amqp://localhost' } = process.env;

const reciveMessage = async ({ data }) => {
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

export const initConsumer = async () => {
  // Consumer
  try {
    const conn = await amqplib.connect(RABBITMQ_HOST);
    const channel = await conn.createChannel();

    await channel.assertQueue('worker');
    debugWorkers('Listening queue channel:worker');

    channel.consume('worker', async msg => {
      if (msg !== null) {
        await reciveMessage(JSON.parse(msg.content.toString()));
        channel.ack(msg);
      }
    });
  } catch (e) {
    debugWorkers(e.message);
  }
};
