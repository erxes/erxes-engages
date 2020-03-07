import * as AWS from 'aws-sdk';
import * as nodemailer from 'nodemailer';
import * as requestify from 'requestify';
import { bulk, single } from './api/emailVerifier';
import { debugBase, debugExternalRequests } from './debuggers';
import Configs, { ISESConfig } from './models/Configs';
import { get, set } from './redisClient';
import { getApi } from './trackers/engageTracker';
import { start } from './workers';

export const createTransporter = async () => {
  const config: ISESConfig = await Configs.getSESConfigs();

  AWS.config.update(config);

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

export const subscribeEngage = () => {
  return new Promise(async (resolve, reject) => {
    const snsApi = await getApi('sns');
    const sesApi = await getApi('ses');
    const configSet = await getConfig('configSet', 'erxes');

    const MAIN_API_DOMAIN = getEnv({ name: 'MAIN_API_DOMAIN' });

    const topicArn = await snsApi
      .createTopic({ Name: configSet })
      .promise()
      .catch(e => {
        return reject(e.message);
      });

    if (!topicArn) {
      return reject('Error occured');
    }

    await snsApi
      .subscribe({
        TopicArn: topicArn.TopicArn,
        Protocol: 'https',
        Endpoint: `${MAIN_API_DOMAIN}/service/engage/tracker`,
      })
      .promise()
      .catch(e => {
        return reject(e.message);
      });

    await sesApi
      .createConfigurationSet({
        ConfigurationSet: {
          Name: configSet,
        },
      })
      .promise()
      .catch(e => {
        if (e.message.includes('already exists')) {
          return;
        }

        return reject(e.message);
      });

    await sesApi
      .createConfigurationSetEventDestination({
        ConfigurationSetName: configSet,
        EventDestination: {
          MatchingEventTypes: [
            'send',
            'reject',
            'bounce',
            'complaint',
            'delivery',
            'open',
            'click',
            'renderingFailure',
          ],
          Name: configSet,
          Enabled: true,
          SNSDestination: {
            TopicARN: topicArn.TopicArn,
          },
        },
      })
      .promise()
      .catch(e => {
        if (e.message.includes('already exists')) {
          return;
        }

        return reject(e.message);
      });

    return resolve(true);
  });
};

interface IRequestParams {
  url?: string;
  path?: string;
  method?: string;
  headers?: { [key: string]: string };
  params?: { [key: string]: string };
  body?: { [key: string]: any };
  form?: { [key: string]: string };
}

/**
 * Sends post request to specific url
 */
export const sendRequest = async (
  { url, method, headers, form, body, params }: IRequestParams,
  errorMessage?: string,
) => {
  const DOMAIN = getEnv({ name: 'DOMAIN' });

  debugExternalRequests(`
    Sending request to
    url: ${url}
    method: ${method}
    body: ${JSON.stringify(body)}
    params: ${JSON.stringify(params)}
  `);

  try {
    const response = await requestify.request(url, {
      method,
      headers: { 'Content-Type': 'application/json', origin: DOMAIN, ...(headers || {}) },
      form,
      body,
      params,
    });

    const responseBody = response.getBody();

    debugExternalRequests(`
      Success from : ${url}
      responseBody: ${JSON.stringify(responseBody)}
    `);

    return responseBody;
  } catch (e) {
    if (e.code === 'ECONNREFUSED' || e.code === 'ENOTFOUND') {
      throw new Error(errorMessage);
    } else {
      const message = e.body || e.message;
      throw new Error(message);
    }
  }
};

export const recieveMessages = ({ action, data }) => {
  switch (action) {
    case 'sendEngage': {
      start(data);

      break;
    }
    case 'verifyEmail': {
      const { emails, email } = data;

      if (email) {
        single(email);
      } else {
        bulk(emails);
      }

      break;
    }
  }
};

export const getValueAsString = async name => {
  const entry = await Configs.getConfig(name);

  if (entry.value) {
    return entry.value.toString();
  }

  return entry.value;
};

export const resetConfigsCache = () => {
  set('configs_erxes_engages', '');
};

export const updateConfigs = async (configsMap): Promise<void> => {
  const prevSESConfigs = await Configs.getSESConfigs();

  await Configs.updateConfigs(configsMap);

  const updatedSESConfigs = await Configs.getSESConfigs();

  resetConfigsCache();

  if (JSON.stringify(prevSESConfigs) !== JSON.stringify(updatedSESConfigs)) {
    await subscribeEngage();
  }
};

export const getConfigs = async () => {
  const configsCache = await get('configs_erxes_engages');

  if (configsCache && configsCache !== '{}') {
    return JSON.parse(configsCache);
  }

  const configsMap = {};
  const configs = await Configs.find({});

  for (const config of configs) {
    configsMap[config.code] = config.value;
  }

  set('configs_erxes_engages', JSON.stringify(configsMap));

  return configsMap;
};

export const getConfig = async (code, defaultValue?) => {
  const configs = await getConfigs();

  if (!configs[code]) {
    return defaultValue;
  }

  return configs[code];
};
