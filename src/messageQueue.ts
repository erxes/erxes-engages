import * as amqplib from 'amqplib';
import * as dotenv from 'dotenv';
import { debugBase, debugWorkers } from './debuggers';
import { receiveMessage } from './workers';

dotenv.config();

const { NODE_ENV, RABBITMQ_HOST = 'amqp://localhost' } = process.env;

let conn;
let channel;

export const initConsumer = async () => {
  // Consumer
  try {
    conn = await amqplib.connect(RABBITMQ_HOST);
    channel = await conn.createChannel();

    await channel.assertQueue('engage-workers');

    debugWorkers('Listening queue channel:engage-workers');

    channel.consume('engage-workers', async msg => {
      if (msg !== null) {
        await receiveMessage(JSON.parse(msg.content.toString()));
        channel.ack(msg);
      }
    });
  } catch (e) {
    debugWorkers(e.message);
  }
};

export const sendMessage = async (channelName: string, data) => {
  if (NODE_ENV === 'test') {
    return;
  }

  debugBase(`Sending data to channel:${channelName}`, data);

  try {
    await channel.assertQueue(channelName);
    await channel.sendToQueue(channelName, Buffer.from(JSON.stringify({ data })));
  } catch (e) {
    debugBase(e.message);
  }
};