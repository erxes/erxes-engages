import * as amqplib from 'amqplib';
import * as AWS from 'aws-sdk';
import * as nodemailer from 'nodemailer';
import Configs from '../models/Configs';
import { debugBase } from './debuggers';

export const createTransporter = async () => {
  const config = await Configs.getConfigs();

  AWS.config.update({
    region: config.region,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  });

  return nodemailer.createTransport({
    SES: new AWS.SES({ apiVersion: '2010-12-01' }),
  });
};

export interface ICustomer {
  name: string;
  _id: string;
  email: string;
}

export interface IUser {
  name: string;
  position: string;
  email: string;
}

/**
 * Dynamic content tags
 */
export const replaceKeys = ({
  content,
  customer,
  user,
}: {
  content: string;
  customer: ICustomer;
  user: IUser;
}): string => {
  let result = content;
  // replace customer fields
  result = result.replace(/{{\s?customer.name\s?}}/gi, customer.name);
  result = result.replace(/{{\s?customer.email\s?}}/gi, customer.email || '');

  // replace user fields
  result = result.replace(/{{\s?user.fullName\s?}}/gi, user.name || '');
  result = result.replace(/{{\s?user.position\s?}}/gi, user.position || '');
  result = result.replace(/{{\s?user.email\s?}}/gi, user.email || '');

  return result;
};

export const getEnv = ({ name, defaultValue }: { name: string; defaultValue?: string }): string => {
  const value = process.env[name];

  if (!value && typeof defaultValue !== 'undefined') {
    return defaultValue;
  }

  if (!value) {
    debugBase(`Missing environment variable configuration for ${name}`);
  }

  return value || '';
};

export const sendMessage = async (channelName: string, data) => {
  const { NODE_ENV, RABBITMQ_HOST = 'amqp://localhost' } = process.env;

  if (NODE_ENV === 'test') {
    return;
  }

  debugBase(`Sending data to channel:${channelName}`, data);

  try {
    const conn = await amqplib.connect(RABBITMQ_HOST);
    const channel = await conn.createChannel();

    await channel.assertQueue(channelName);
    await channel.sendToQueue(channelName, Buffer.from(JSON.stringify({ data })));
  } catch (e) {
    debugBase(e.message);
  }
};
