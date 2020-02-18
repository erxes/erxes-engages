import * as EmailValidator from 'email-deep-validator';
import { Router } from 'express';
import { sendMessage } from '../messageQueue';
import { Emails } from '../models';
import { sendRequest } from '../utils';

const router = Router();
const apiKey = 'LUbFcpWbOlqoOFEgHZ6Rw4x8zpFGhzckm1hfJ2rAr1UgzDKxxHq8la3dlkw050RH';

export const single = async ({ email, customerId }: { email: string; customerId: string }) => {
  const emailOnDb = await Emails.findOne({ email });

  if (emailOnDb) {
    return sendMessage('engages-api:email-verifier-single', { customerId, status: emailOnDb.status });
  }

  const sendResult = async (status: string) => {
    await Emails.create({ email, status });

    return sendMessage('engages-api:email-verifier-single', { customerId, status });
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
};

export const bulk = async (emails: string[]) => {
  const url = `https://truemail.io/api/v1/tasks/bulk?access_token=${apiKey}`;

  const unverifiedEmails: any[] = [];
  const verifiedEmails: any[] = [];

  for (const email of emails) {
    const found = await Emails.findOne({ email });

    if (found) {
      verifiedEmails.push({ email: found.email, status: found.status });
    } else {
      unverifiedEmails.push({ email });
    }
  }

  let response = {
    verifiedEmails,
  };

  if (unverifiedEmails.length > 0) {
    const thirdPartyResponse = await sendRequest({
      url,
      method: 'POST',
      body: {
        file: unverifiedEmails,
      },
    });

    response = { ...response, ...thirdPartyResponse };
  }

  await sendMessage('engages-api:email-verifier-bulk', response);
};

export const checkStatus = async (data: any) => {
  const { taskId } = data;
  const url = `https://truemail.io/api/v1/tasks/${taskId}/status?access_token=${apiKey}`;

  const response = await sendRequest({
    url,
    method: 'GET',
  });

  await sendMessage('engages-api:email-verifier-status', JSON.parse(response).data);
};

export const download = async (taskId: string) => {
  const url = `https://truemail.io/api/v1/tasks/${taskId}/download?access_token=${apiKey}&timeout=30000`;

  const response = await sendRequest({
    url,
    method: 'GET',
  });

  const rows = response.split('\n');
  const emails = [];

  for (const row of rows) {
    const rowArray = row.split(',');
    if (rowArray.length === 3) {
      const email = rowArray[0];
      const status = rowArray[2];

      emails.push({
        email,
        status,
      });

      const found = await Emails.findOne({ email });

      if (!found) {
        const doc = {
          email,
          status,
          created: new Date(),
        };

        await Emails.create(doc);
      }
    }
  }

  await sendMessage('engages-api:email-verifier-download', emails);
};

export default router;
