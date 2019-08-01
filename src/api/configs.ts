import { Router } from 'express';
import { debugEngages, debugRequest } from '../debuggers';
import { Configs } from '../models';
import { handleError, respondWithResult } from './utils';

const router = Router();

router.post('/save', async (req, res) => {
  debugRequest(debugEngages, req);

  return Configs.updateConfig(req.body)
    .then(respondWithResult(req, res, 201))
    .catch(handleError(req, res));
});

router.get(`/detail`, async (req, res) => {
  debugRequest(debugEngages, req);

  return Configs.getConfigs()
    .then(respondWithResult(req, res, 201))
    .catch(handleError(req, res));
});

export default router;
