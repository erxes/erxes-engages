import { Router } from 'express';

const router = Router();

import { debugEngages, debugRequest, debugResponse } from '../debuggers';
import { start } from '../workers';

router.post('/send', async (req, res) => {
  debugRequest(debugEngages, req);

  const { customers, email, user, engageMessageId } = req.body;

  try {
    start({
      customers,
      email,
      engageMessageId,
      user,
    });

    debugResponse(debugEngages, req, 'true');

    return res.json(true);
  } catch (e) {
    debugResponse(debugEngages, req, JSON.stringify(e));

    return res.status(500).send(e);
  }
});

export default router;