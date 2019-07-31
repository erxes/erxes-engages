import * as requestify from 'requestify';
import { getEnv } from '../utils';
import { debugEngages, debugExternalApi, debugResponse } from '../utils/debuggers';

export const respondWithResult = (req, res: any, statusCode?: number) => {
  statusCode = statusCode || 200;

  return result => {
    if (result) {
      debugResponse(debugEngages, req, JSON.stringify(result));
      res.status(statusCode).json(result);
    }
  };
};

export const handleResultNotFound = (req, res) => {
  return result => {
    if (!result) {
      debugResponse(debugEngages, req, JSON.stringify(null));
      res.status(404).end();
      return null;
    }

    return result;
  };
};

export const handleError = (req, res: any, statusCode?: number) => {
  statusCode = statusCode || 500;

  return err => {
    debugResponse(debugEngages, req, JSON.stringify(err));
    res.status(statusCode).send(err);
  };
};

export const handeResultNotFoundWithEmptyObject = (req, res) => {
  return result => {
    if (!result) {
      debugResponse(debugEngages, req, JSON.stringify({}));
      res.json({}).end();
      return null;
    }

    return result;
  };
};

/**
 * Send request to workers api
 */
export const fetchWorkersApi = ({ path, method, body, params }: IRequestParams) => {
  const WORKERS_API_DOMAIN = getEnv({ name: 'WORKERS_API_DOMAIN' });

  return sendRequest(
    { url: `${WORKERS_API_DOMAIN}${path}`, method, body, params },
    'Failed to connect workers api. Check WORKERS_API_DOMAIN env or workers api is not running',
  );
};

/**
 * Send request to main api
 */
export const fetchMainApi = async ({ path, method, body, params }: IRequestParams) => {
  const { MAIN_API_DOMAIN } = process.env;

  return sendRequest({ url: `${MAIN_API_DOMAIN}${path}`, method, body, params });
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
  const NODE_ENV = getEnv({ name: 'NODE_ENV' });
  const DOMAIN = getEnv({ name: 'DOMAIN' });

  if (NODE_ENV === 'test') {
    return;
  }

  debugExternalApi(`
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

    debugExternalApi(`
      Success from : ${url}
      responseBody: ${JSON.stringify(responseBody)}
    `);

    return responseBody;
  } catch (e) {
    if (e.code === 'ECONNREFUSED') {
      debugExternalApi(errorMessage);
      throw new Error(errorMessage);
    } else {
      debugExternalApi(`Error occurred : ${e.body}`);
      throw new Error(e.body);
    }
  }
};
