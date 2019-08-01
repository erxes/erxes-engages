import { Router } from 'express';

const router = Router();

import { debugEngages, debugRequest } from '../debuggers';
import { DeliveryReports, Stats } from '../models';
import { handeResultNotFoundWithEmptyObject, handleError, respondWithResult } from './utils';

router.get('/statsList/:engageMessageId', async (req, res) => {
  debugRequest(debugEngages, req);

  const { engageMessageId } = req.params;

  return DeliveryReports.findOne({ engageMessageId })
    .then(handeResultNotFoundWithEmptyObject(req, res))
    .then(respondWithResult(req, res))
    .catch(handleError(req, res));
});

router.get(`/reportsList/:engageMessageId`, async (req, res) => {
  debugRequest(debugEngages, req);

  return Stats.findOne({ engageMessageId: req.params.engageMessageId })
    .then(handeResultNotFoundWithEmptyObject(req, res))
    .then(respondWithResult(req, res))
    .catch(handleError(req, res));
});

export default router;