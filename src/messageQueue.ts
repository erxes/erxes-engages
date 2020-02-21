import * as amqplib from 'amqplib';
import * as dotenv from 'dotenv';
import { debugBase, debugWorkers } from './debuggers';
import { recieveMessages } from './utils';

dotenv.config();

const { NODE_ENV, RABBITMQ_HOST = 'amqp://localhost' } = process.env;

let conn;
let channel;

export const MSG_QUEUE_ACTIONS = {
  EMAIL_VERIFY: 'emailVerify',
  SET_DONOT_DISTURB: 'setDoNotDisturb',
  BULK: 'bulk',
  ALL: ['emailVerify', 'setDoNotDisturb', 'bulk'],
};

export const initConsumer = async () => {
  try {
    console.log('RABBITMQ_HOST: ', RABBITMQ_HOST);
    conn = await amqplib.connect(RABBITMQ_HOST);
    channel = await conn.createChannel();

    // listen for erxes api ===========
    await channel.assertQueue('erxes-api:engages-notification');

    channel.consume('erxes-api:engages-notification', async msg => {
      if (msg !== null) {
        recieveMessages(JSON.parse(msg.content.toString()));

        channel.ack(msg);
      }
    });
  } catch (e) {
    debugWorkers(e.message);
  }
};

interface IQueueData {
  action: string;
  data: any;
}

export const sendMessage = async (queueName: string, data: IQueueData) => {
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
