import * as EmailValidator from 'email-deep-validator';
import { Router } from 'express';
import { sendMessage } from '../messageQueue';
import { Emails } from '../models';
import { sendRequest } from '../utils';

interface ISingleTrueMail {
  status: string;
  result: string;
  format: string;
  server_status: string;
  email_id: number;
  valid_dns_record: number;
  valid_mx_record: number;
  reachable_smtp_server: number;
  fqdn: string;
  type: string;
}

interface IBulkTrueMail {
  status: string;
  task_id: number;
}

interface IStatusTrueMail {
  status: string;
  total: number;
  billable: number;
  valid: number;
  invalid: number;
  catchall: number;
  disposable: number;
  unknown: number;
  duplicates: number;
}

interface IDownload {
  email: string;
  status: string;
}

const router = Router();
const apiKey = 'LUbFcpWbOlqoOFEgHZ6Rw4x8zpFGhzckm1hfJ2rAr1UgzDKxxHq8la3dlkw050RH';

const singleTrueMail = async (email: string): Promise<ISingleTrueMail> => {
  const url = `https://truemail.io/api/v1/verify/single?access_token=${apiKey}&email=${email}`;

  const response = await sendRequest({
    url,
    method: 'GET',
  });

  return JSON.parse(response);
};

const bulkTrueMail = async (unverifiedEmails: string[]): Promise<IBulkTrueMail> => {
  const url = `https://truemail.io/api/v1/tasks/bulk?access_token=${apiKey}`;

  const response = await sendRequest({
    url,
    method: 'POST',
    body: {
      file: unverifiedEmails,
    },
  });

  return JSON.parse(response);
};

const statusTrueMail = async (taskId: string): Promise<IStatusTrueMail> => {
  const url = `https://truemail.io/api/v1/tasks/${taskId}/status?access_token=${apiKey}`;

  const response = await sendRequest({
    url,
    method: 'GET',
  });

  return JSON.parse(response).data;
};

const downloadTrueMail = async (taskId: string): Promise<IDownload[]> => {
  const url = `https://truemail.io/api/v1/tasks/${taskId}/download?access_token=${apiKey}&timeout=30000`;

  const response = await sendRequest({
    url,
    method: 'GET',
  });

  const rows = response.split('\n');
  const emails: IDownload[] = [];

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

  return emails;
};

export const single = async ({ email, customerId, type }: { email: string; customerId: string; type: string }) => {
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

  let response;

  switch (type) {
    case 'truemail': {
      response = await singleTrueMail(email);

      break;
    }
  }

  if (response.status === 'success') {
    return sendResult(response.result);
  }

  return sendResult('invalid');
};

export const bulk = async ({ emails, type }: { emails: string[]; type: string }) => {
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
    let thirdPartyResponse;

    switch (type) {
      case 'truemail': {
        thirdPartyResponse = await bulkTrueMail(unverifiedEmails);

        break;
      }
    }

    console.log('response: ', response);

    response = { ...response, ...thirdPartyResponse };
  }

  await sendMessage('engages-api:email-verifier-bulk', response);
};

export const checkStatus = async (data: any) => {
  const { taskId, type } = data;

  let response;

  switch (type) {
    case 'truemail': {
      response = await statusTrueMail(taskId);
    }
  }

  await sendMessage('engages-api:email-verifier-status', response);
};

export const download = async ({ taskId, type }: { taskId: string; type: string }) => {
  let emails: IDownload[] = [];

  console.log('download type: ', type);

  switch (type) {
    case 'truemail': {
      emails = await downloadTrueMail(taskId);

      break;
    }
  }

  await sendMessage('engages-api:email-verifier-download', emails);
};

export default router;
