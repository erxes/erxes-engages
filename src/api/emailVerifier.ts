import * as EmailValidator from 'email-deep-validator';
import { MSG_QUEUE_ACTIONS, sendMessage } from '../messageQueue';
import { Emails } from '../models';
import { sendRequest } from '../utils';

interface ISingleTrueMail {
  status: string;
  result?: string;
  format?: string;
  server_status?: string;
  email_id?: number;
  valid_dns_record?: number;
  valid_mx_record?: number;
  reachable_smtp_server?: number;
  fqdn?: string;
  type?: string;
}

const TRUEMAIL_API_KEY = 'LUbFcpWbOlqoOFEgHZ6Rw4x8zpFGhzckm1hfJ2rAr1UgzDKxxHq8la3dlkw050RH';

const singleTrueMail = async (email: string): Promise<ISingleTrueMail> => {
  if (TRUEMAIL_API_KEY) {
    const url = `https://truemail.io/api/v1/verify/single?access_token=${TRUEMAIL_API_KEY}&email=${email}`;

    return sendRequest({
      url,
      method: 'GET',
    });
  }

  return { status: 'notFound' };
};

const bulkTrueMail = async (unverifiedEmails: string[]) => {
  const url = `https://truemail.io/api/v1/tasks/bulk?access_token=${TRUEMAIL_API_KEY}`;

  const result = await sendRequest({
    url,
    method: 'POST',
    body: {
      file: unverifiedEmails,
    },
  });

  return sendMessage('engagesNotification', { action: MSG_QUEUE_ACTIONS.BULK, data: result });
};

const sendSingleMessage = async (doc: { email: string; status: string }, create?: boolean) => {
  if (create) {
    await Emails.create(doc);
  }

  return sendMessage('engagesNotification', { action: MSG_QUEUE_ACTIONS.EMAIL_VERIFY, data: [doc] });
};

export const single = async ({ email, type }: { email: string; type: string }) => {
  const emailOnDb = await Emails.findOne({ email });

  if (emailOnDb) {
    return sendSingleMessage({ email, status: emailOnDb.status });
  }

  const emailValidator = new EmailValidator();
  const { validDomain, validMailbox } = await emailValidator.verify(email);

  if (!validDomain) {
    return sendSingleMessage({ email, status: 'invalid' }, true);
  }

  if (!validMailbox && validMailbox === null) {
    return sendSingleMessage({ email, status: 'invalid' }, true);
  }

  let response;

  switch (type) {
    case 'truemail': {
      response = await singleTrueMail(email);

      break;
    }
  }

  if (response.status === 'success') {
    return sendSingleMessage({ email, status: response.result }, true);
  }

  // if there is no email verification service
  if (response.status === 'notFound') {
    return sendSingleMessage({ email, status: 'valid' });
  }

  // if status is not success
  return sendSingleMessage({ email, status: 'invalid' });
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

  if (verifiedEmails.length > 0) {
    sendMessage('engagesNotification', { action: MSG_QUEUE_ACTIONS.EMAIL_VERIFY, data: verifiedEmails });
  }

  if (unverifiedEmails.length > 0) {
    switch (type) {
      case 'truemail': {
        if (!TRUEMAIL_API_KEY) {
          throw new Error('Please configure TRUEMAIL_API_KEY');
        }

        await bulkTrueMail(unverifiedEmails);

        break;
      }
    }
  }
};
