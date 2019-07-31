import * as debug from 'debug';

export const debugInit = debug('erxes-engages:init');
export const debugDb = debug('erxes-engages:db');
export const debugBase = debug('erxes-engages:base');
export const debugEngages = debug('erxes-engages:engages');
export const debugExternalRequests = debug('erxes-engages:external-requests');
export const debugWorkers = debug('erxes-engages-worker:worker');
export const debugExternalApi = debug('erxes-engages:external-api-fetcher');

export const debugRequest = (debugInstance, req) =>
  debugInstance(`
        Receiving ${req.path} request from ${req.headers.origin}
        body: ${JSON.stringify(req.body || {})}
        queryParams: ${JSON.stringify(req.query)}
    `);

export const debugResponse = (debugInstance, req, data = 'success') =>
  debugInstance(`Responding ${req.path} request to ${req.headers.origin} with ${data}`);
