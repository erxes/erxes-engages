import { Configs } from '../models';
import { configIdByDefault } from '../models/Configs';
import { debugEngages, debugRequest } from '../utils/debuggers';
import { handleError, handleResultNotFound, respondWithResult } from './utils';

export const save = async (req, res) => {
  debugRequest(debugEngages, req);

  Configs.updateConfig(req.body)
    .then(respondWithResult(req, res, 201))
    .catch(handleError(req, res));
};

export const detail = async (req, res) => {
  debugRequest(debugEngages, req);

  return Configs.findById(configIdByDefault)
    .then(handleResultNotFound(req, res))
    .then(respondWithResult(req, res))
    .catch(handleError(req, res));
};
