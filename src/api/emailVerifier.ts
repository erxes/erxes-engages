import * as EmailValidator from 'email-deep-validator';
import { Router } from 'express';
import { debugEngages, debugRequest } from '../debuggers';
import { Emails } from '../models';
import { sendRequest } from '../utils';

const router = Router();
const apiKey = 'LUbFcpWbOlqoOFEgHZ6Rw4x8zpFGhzckm1hfJ2rAr1UgzDKxxHq8la3dlkw050RH';

router.post('/single', async (req, res, _next) => {
  debugRequest(debugEngages, req);
  const { email } = req.query;

  const emailOnDb = await Emails.findOne({ email });

  if (emailOnDb) {
    return res.send(emailOnDb.status);
  }

  const sendResult = async (status: string) => {
    await Emails.create({ email, status });

    return res.send('invalid');
  };

  const emailValidator = new EmailValidator();
  const { validDomain, validMailbox } = await emailValidator.verify(email);

  if (!validDomain) {
    return sendResult('invalid');
  }

  if (!validMailbox && validMailbox === null) {
    return sendResult('invalid');
  }

  const url = `https://truemail.io/api/v1/verify/single?access_token=${apiKey}&email=${email}`;

  const responseJSON = await sendRequest({
    url,
    method: 'GET',
  });

  const response = JSON.parse(responseJSON);

  if (response.status === 'success') {
    return sendResult(response.result);
  }

  return sendResult('invalid');
});

router.post('/bulk', async (req, res, _next) => {
  debugRequest(debugEngages, req);
  const emails = JSON.parse(req.body.emails || '[]');

  const url = `https://truemail.io/api/v1/tasks/bulk?access_token=${apiKey}`;

  const remainedEmails: any[] = [];

  for (const email of emails) {
    const found = await Emails.findOne({ email });

    if (!found) {
      remainedEmails.push({ email });
    }
  }

  const response = await sendRequest({
    url,
    method: 'POST',
    body: {
      file: remainedEmails,
    },
  });

  return res.send(response);
});

router.get('/bulk/status', async (req, res, next) => {
  debugRequest(debugEngages, req);

  const { taskId } = req.query;

  if (taskId) {
    const url = `https://truemail.io/api/v1/tasks/${taskId}/status?access_token=${apiKey}`;

    const response = await sendRequest({
      url,
      method: 'GET',
    });

    return res.send(response);
  }

  return next(new Error('Please send `taskId`'));
});

router.get('/bulk/download', async (req, res, next) => {
  debugRequest(debugEngages, req);

  const { taskId } = req.query;

  if (taskId) {
    const url = `https://truemail.io/api/v1/tasks/${taskId}/download?access_token=${apiKey}`;

    const response = await sendRequest({
      url,
      method: 'GET',
    });

    const rows = response.split('\n');
    const emails = [];

    for (const row of rows) {
      const rowArray = row.split(',');

      const email = rowArray[0];
      const status = rowArray[2];

      emails.push({
        email,
        status,
      });

      const doc = {
        email,
        status,
        created: new Date(),
      };

      await Emails.create(doc);
    }

    return res.send(emails);
  }

  return next(new Error('Please send `taskId`'));
});

export default router;
