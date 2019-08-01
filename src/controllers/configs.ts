import { debugEngages, debugRequest } from '../debuggers';
import { Configs } from '../models';
import { handleError, respondWithResult } from './utils';

export const save = async (req, res) => {
  debugRequest(debugEngages, req);

  return Configs.updateConfig(req.body)
    .then(respondWithResult(req, res, 201))
    .catch(handleError(req, res));
};

export const detail = async (req, res) => {
  debugRequest(debugEngages, req);

  return Configs.getConfigs()
    .then(respondWithResult(req, res, 201))
    .catch(handleError(req, res));
};
