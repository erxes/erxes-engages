import * as amqplib from 'amqplib';
import * as dotenv from 'dotenv';
import { debugBase, debugWorkers } from './debuggers';
import { start } from './workers';

dotenv.config();

const { NODE_ENV, RABBITMQ_HOST = 'amqp://localhost' } = process.env;

let conn;
let channel;

export const initConsumer = async () => {
  try {
    conn = await amqplib.connect(RABBITMQ_HOST);
    channel = await conn.createChannel();

    // listen for erxes api ===========
    await channel.assertQueue('erxes-api:send-engage');

    channel.consume('erxes-api:send-engage', async msg => {
      if (msg !== null) {
        const data = JSON.parse(msg.content.toString());

        start(data);

        channel.ack(msg);
      }
    });
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
    await channel.assertQueue('engages-api:set-donot-disturb');
    await channel.sendToQueue('engages-api:set-donot-disturb', Buffer.from(JSON.stringify({ action, data })));
  } catch (e) {
    debugBase(e.message);
  }
};