import { Router } from 'express';
import { debugEngages, debugRequest } from '../debuggers';
import { Configs } from '../models';
import { awsRequests } from '../trackers/engageTracker';
import { subscribeEngage } from '../utils';

const router = Router();

router.post('/save', async (req, res, next) => {
  debugRequest(debugEngages, req);

  let config = {};

  try {
    config = await Configs.updateConfig(req.body);
    await subscribeEngage();
  } catch (e) {
    return next(new Error(e));
  }

  return res.json(config);
});

router.get('/detail', async (req, res, next) => {
  debugRequest(debugEngages, req);

  let configs = {};

  try {
    configs = await Configs.getConfigs();
  } catch (e) {
    return next(new Error(e));
  }

  return res.json(configs);
});

router.get('/get-verified-emails', async (req, res, next) => {
  debugRequest(debugEngages, req);

  try {
    const emails = await awsRequests.getVerifiedEmails();
    return res.json(emails);
  } catch (e) {
    return next(new Error(e));
  }
});

export default router;