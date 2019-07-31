import * as AWS from 'aws-sdk';
import * as nodemailer from 'nodemailer';
import * as requestify from 'requestify';
import Configs, { configIdByDefault } from '../models/Configs';
import { debugBase, debugExternalRequests } from './debuggers';

export const createTransporter = async () => {
  const config = await Configs.findById(configIdByDefault);

  if (!config) {
    return;
  }

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

interface IRequestParams {
  url?: string;
  path?: string;
  method: string;
  params?: { [key: string]: string };
  body?: { [key: string]: string };
}

/**
 * Send request
 */
export const sendRequest = async ({ url, method, body, params }: IRequestParams) => {
  const { DOMAIN } = process.env;

  const reqBody = JSON.stringify(body || {});
  const reqParams = JSON.stringify(params || {});

  try {
    debugExternalRequests(`
      Sending request
      url: ${url}
      method: ${method}
      body: ${reqBody}
      params: ${reqParams}
    `);

    const response = await requestify.request(url, {
      method,
      headers: { 'Content-Type': 'application/json', origin: DOMAIN },
      body,
      params,
    });

    const responseBody = response.getBody();

    debugExternalRequests(`
      Success from ${url}
      requestBody: ${reqBody}
      requestParams: ${reqParams}
      responseBody: ${JSON.stringify(responseBody)}
    `);

    return responseBody;
  } catch (e) {
    if (e.code === 'ECONNREFUSED') {
      throw new Error(`Failed to connect ${url}`);
    } else {
      throw new Error(e.body);
    }
  }
};

/**
 * Send request to main api
 */
export const fetchMainApi = async ({ path, method, body, params }: IRequestParams) => {
  const { MAIN_API_DOMAIN } = process.env;

  return sendRequest({ url: `${MAIN_API_DOMAIN}${path}`, method, body, params });
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
