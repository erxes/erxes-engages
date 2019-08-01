import { debugEngages, debugRequest, debugResponse } from '../debuggers';
import { sendMessage } from '../messageQueue';

export const send = async (req, res) => {
  debugRequest(debugEngages, req);

  const { customers, email, user, engageMessageId } = req.body;

  try {
    await sendMessage('engage-workers', {
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
};
