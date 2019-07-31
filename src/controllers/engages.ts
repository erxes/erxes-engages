import { Configs } from '../models';
import { configIdByDefault } from '../models/Configs';
import { debugEngages, debugRequest, debugResponse } from '../utils/debuggers';
import { fetchWorkersApi, handleResultNotFound } from './utils';

export const send = async (req, res) => {
  debugRequest(debugEngages, req);

  const { customers, email, user, engageMessageId } = req.body;

  await Configs.findById(configIdByDefault).then(handleResultNotFound(req, res));

  try {
    await fetchWorkersApi({
      path: '/send',
      method: 'post',
      body: {
        customers,
        email,
        engageMessageId,
        user,
      },
    });

    debugResponse(debugEngages, req, 'true');

    return res.json(true);
  } catch (e) {
    debugResponse(debugEngages, req, JSON.stringify(e));

    return res.status(500).send(e);
  }
};
