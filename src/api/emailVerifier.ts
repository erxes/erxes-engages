import { Router } from 'express';
import { debugEngages, debugRequest } from '../debuggers';
import { sendRequest } from '../utils';

const router = Router();

router.post('/single', async (req, res, next) => {
  debugRequest(debugEngages, req);

  const { email } = req.query;

  const apiKey = 'LUbFcpWbOlqoOFEgHZ6Rw4x8zpFGhzckm1hfJ2rAr1UgzDKxxHq8la3dlkw050RH';
  const url = `https://truemail.io/api/v1/verify/single?access_token=${apiKey}&email=${email}`;

  const response = await sendRequest({
    url,
    method: 'POST',
  });

  if (response.status === 'success') {
    return response.result;
  }
});
