import * as amqplib from 'amqplib';
import * as dotenv from 'dotenv';
import { bulk, checkStatus, download } from './api/emailVerifier';
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

    await channel.assertQueue('erxes-api:send-engage');

    channel.consume('erxes-api:send-engage', async msg => {
      if (msg !== null) {
        const data = JSON.parse(msg.content.toString());

        start(data);

        channel.ack(msg);
      }
    });

    await channel.assertQueue('erxes-api:email-verifier-status');

    channel.consume('erxes-api:email-verifier-status', async msg => {
      if (msg !== null) {
        const data = JSON.parse(msg.content.toString());

        await checkStatus(data);

        channel.ack(msg);
      }
    });

    await channel.assertQueue('erxes-api:email-verifier-bulk');

    channel.consume('erxes-api:email-verifier-bulk', async msg => {
      if (msg !== null) {
        const data = JSON.parse(msg.content.toString());

        await bulk(data);

        channel.ack(msg);
      }
    });

    await channel.assertQueue('erxes-api:email-verifier-download');

    channel.consume('erxes-api:email-verifier-download', async msg => {
      if (msg !== null) {
        const data = JSON.parse(msg.content.toString());

        await download(data);

        channel.ack(msg);
      }
    });
  } catch (e) {
    debugWorkers(e.message);
  }
};

export const sendMessage = async (queueName: string, data: any) => {
  if (NODE_ENV === 'test') {
    return;
  }

  debugBase(`Sending data to engagesApi queue`, data);

  try {
    await channel.assertQueue(queueName);
    await channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data || {})));
  } catch (e) {
    debugBase(e.message);
  }
};
