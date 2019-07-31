import * as Random from 'meteor-random';
import * as mongoose from 'mongoose';
import { Configs, Stats } from '../models';
import { createTransporter, getEnv, replaceKeys } from '../utils';
import { connect } from './utils';

// tslint:disable-next-line
const { parentPort, workerData } = require('worker_threads');

let cancel = false;

parentPort.once('message', message => {
  if (message === 'cancel') {
    parentPort.postMessage('Cancelled');
    cancel = true;
  }
});

connect().then(async () => {
  if (cancel) {
    return;
  }

  const { user, email, result, engageMessageId } = workerData;

  if (result.length === 0) {
    return;
  }

  const { content, subject, attachments } = email;

  const transporter = await createTransporter();

  for (const customer of result) {
    const mailMessageId = Random.id();

    let mailAttachment = [];

    if (attachments.length > 0) {
      mailAttachment = attachments.map(file => {
        return {
          filename: file.name || '',
          path: file.url || '',
        };
      });
    }

    let replacedContent = replaceKeys({ content, customer, user });

    const MAIN_API_DOMAIN = getEnv({ name: 'MAIN_API_DOMAIN' });
    const configSetDb = await Configs.findOne({ code: 'configSet' });
    const configSet = configSetDb.value;

    const unSubscribeUrl = `${MAIN_API_DOMAIN}/unsubscribe/?cid=${customer._id}`;

    replacedContent += `<div style="padding: 10px; color: #ccc; text-align: center; font-size:12px;">If you want to use service like this click <a style="text-decoration: underline; color: #ccc;" href="https://erxes.io" target="_blank">here</a> to read more. Also you can opt out from our email subscription <a style="text-decoration: underline;color: #ccc;" rel="noopener" target="_blank" href="${unSubscribeUrl}">here</a>.  <br>© 2019 erxes inc Growth Marketing Platform </div>`;

    try {
      await transporter.sendMail({
        from: user.email,
        to: customer.email,
        subject,
        attachments: mailAttachment,
        html: replacedContent,
        headers: {
          'X-SES-CONFIGURATION-SET': configSet,
          EngageMessageId: engageMessageId,
          CustomerId: customer._id,
          MailMessageId: mailMessageId,
        },
      });
    } catch (e) {
      console.log(e.message);
      return;
    }

    await Stats.updateOne({ engageMessageId }, { $inc: { total: 1 } });
  }

  mongoose.connection.close();

  parentPort.postMessage('Successfully finished job');
});
