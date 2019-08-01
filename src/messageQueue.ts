import * as amqplib from 'amqplib';
import * as dotenv from 'dotenv';
import { debugBase, debugWorkers } from './debuggers';

dotenv.config();

const { NODE_ENV, RABBITMQ_HOST = 'amqp://localhost' } = process.env;

let conn;
let channel;

export const initMessageQueue = async () => {
  try {
    conn = await amqplib.connect(RABBITMQ_HOST);
    channel = await conn.createChannel();
  } catch (e) {
    debugWorkers(e.message);
  }
};

export const sendMessage = async (action: string, data: any) => {
  if (NODE_ENV === 'test') {
    return;
  }

  debugBase(`Sending data to engagesApi queue`, data);

  try {
    await channel.assertQueue('engagesApi');
    await channel.sendToQueue('engagesApi', Buffer.from(JSON.stringify({ action, data })));
  } catch (e) {
    debugBase(e.message);
  }
};