import * as EmailValidator from 'email-deep-validator';
import { MSG_QUEUE_ACTIONS, sendMessage } from '../messageQueue';
import { Emails } from '../models';
import { EMAIL_VALIDATION_STATUSES } from '../models/Emails';
import { getConfig, sendRequest } from '../utils';

const sendSingleMessage = async (doc: { email: string; status: string }, create?: boolean) => {
  if (create) {
    await Emails.createEmail(doc);
  }

  return sendMessage('engagesNotification', { action: MSG_QUEUE_ACTIONS.EMAIL_VERIFY, data: [doc] });
};

const singleTrueMail = async (email: string) => {
  try {
    const trueMailApiKey = await getConfig('trueMailApiKey');

    const url = `https://truemail.io/api/v1/verify/single?access_token=${trueMailApiKey}&email=${email}`;

    const response = await sendRequest({
      url,
      method: 'GET',
    });

    return JSON.parse(response);
  } catch (e) {
    return { status: 'failure' };
  }
};

const bulkTrueMail = async (unverifiedEmails: string[]) => {
  const trueMailApiKey = await getConfig('trueMailApiKey');

  const url = `https://truemail.io/api/v1/tasks/bulk?access_token=${trueMailApiKey}`;

  try {
    const result = await sendRequest({
      url,
      method: 'POST',
      body: {
        file: unverifiedEmails,
      },
    });

    sendMessage('engagesBulkEmailNotification', { action: MSG_QUEUE_ACTIONS.BULK, data: result });
  } catch (e) {
    sendMessage('engagesBulkEmailNotification', { action: MSG_QUEUE_ACTIONS.BULK, data: e.message });
  }
};

export const single = async (email: string) => {
  const emailOnDb = await Emails.findOne({ email });

  if (emailOnDb) {
    return sendSingleMessage({ email, status: emailOnDb.status });
  }

  const emailValidator = new EmailValidator();
  const { validDomain, validMailbox } = await emailValidator.verify(email);

  if (!validDomain || !validMailbox) {
    return sendSingleMessage({ email, status: EMAIL_VALIDATION_STATUSES.INVALID }, true);
  }

  let response: { status?: string; result?: string } = {};

  const type = await getConfig('emailVerificationType');

  switch (type) {
    case 'truemail': {
      response = await singleTrueMail(email);

      break;
    }
  }

  if (response.status === 'success') {
    return sendSingleMessage({ email, status: response.result }, true);
  }

  // if status is not success
  return sendSingleMessage({ email, status: EMAIL_VALIDATION_STATUSES.VALID });
};

export const bulk = async (emails: string[]) => {
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
    const type = await getConfig('emailVerificationType');

    switch (type) {
      case 'truemail': {
        await bulkTrueMail(unverifiedEmails);

        break;
      }
    }
  } else {
    sendMessage('engagesBulkEmailNotification', {
      action: MSG_QUEUE_ACTIONS.BULK,
      data: 'There are no emails to verify on the email verification system',
    });
  }
};
