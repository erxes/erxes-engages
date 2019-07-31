import * as AWS from 'aws-sdk';
import { Configs, DeliveryReports, Stats } from '../models';
import { fetchMainApi } from '../utils';

export const getApi = async (type: string): Promise<any> => {
  const config = await Configs.getConfigs();

  if (!config) {
    return;
  }

  AWS.config.update({
    region: config.region,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  });

  if (type === 'ses') {
    return new AWS.SES();
  }

  return new AWS.SNS();
};

/*
 * Receives notification from amazon simple notification service
 * And updates engage message status and stats
 */
const handleMessage = async message => {
  const obj = JSON.parse(message);

  const { eventType, mail } = obj;
  const { headers } = mail;

  const engageMessageId = headers.find(header => header.name === 'Engagemessageid');

  const mailId = headers.find(header => header.name === 'Mailmessageid');

  const customerId = headers.find(header => header.name === 'Customerid');

  const mailHeaders = {
    engageMessageId: engageMessageId.value,
    mailId: mailId.value,
    customerId: customerId.value,
  };

  const type = eventType.toLowerCase();

  await Stats.updateStats(mailHeaders.engageMessageId, type);

  const rejected = await DeliveryReports.updateOrCreateReport(mailHeaders, type);

  if (rejected === 'reject') {
    await fetchMainApi({
      path: `engages-api`,
      body: {
        action: 'update-customer',
        payload: JSON.stringify({
          _id: mail.customerId,
          doNotDisturb: true,
        }),
      },
      method: `post`,
    });
  }

  return true;
};

export const trackEngages = expressApp => {
  expressApp.post(`/service/engage/tracker`, (req, res) => {
    const chunks: any = [];

    req.setEncoding('utf8');

    req.on('data', chunk => {
      chunks.push(chunk);
    });

    req.on('end', async () => {
      const message = JSON.parse(chunks.join(''));

      const { Type = '', Message = {}, Token = '', TopicArn = '' } = message;

      if (Type === 'SubscriptionConfirmation') {
        await getApi('sns').then(api => api.confirmSubscription({ Token, TopicArn }).promise());

        return res.end('success');
      }

      await handleMessage(Message);
    });

    return res.end('success');
  });
};

export const awsRequests = {
  getVerifiedEmails() {
    return getApi('ses').then(api => api.listVerifiedEmailAddresses().promise());
  },
};
