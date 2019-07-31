import { DeliveryReports, Stats } from '../models';
import { debugEngages, debugRequest } from '../utils/debuggers';
import { handeResultNotFoundWithEmptyObject, handleError, respondWithResult } from './utils';

export const reportsList = async (req, res) => {
  debugRequest(debugEngages, req);

  const { engageMessageId } = req.params;

  return DeliveryReports.findById(engageMessageId)
    .then(handeResultNotFoundWithEmptyObject(req, res))
    .then(respondWithResult(req, res))
    .catch(handleError(req, res));
};

export const statsList = async (req, res) => {
  debugRequest(debugEngages, req);

  return Stats.findById(req.params.engageMessageId)
    .then(handeResultNotFoundWithEmptyObject(req, res))
    .then(respondWithResult(req, res))
    .catch(handleError(req, res));
};
