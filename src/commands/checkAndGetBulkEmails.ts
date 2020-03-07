import * as amqplib from 'amqplib';
import { connect, disconnect } from '../connection';
import { MSG_QUEUE_ACTIONS } from '../messageQueue';
import { Emails } from '../models';
import { initRedis } from '../redisClient';
import { getConfig, sendRequest } from '../utils';

initRedis();

console.log('Instruction: yarn checkAndGetBulkEmails taskId');

connect().then(async () => {
  const getTrueMailBulk = async (taskId: string) => {
    const { RABBITMQ_HOST = 'amqp://localhost' } = process.env;

    const connection = await amqplib.connect(RABBITMQ_HOST);
    const channel = await connection.createChannel();

    const trueMailApiKey = await getConfig('trueMailApiKey');

    const url = `https://truemail.io/api/v1/tasks/${taskId}/download?access_token=${trueMailApiKey}&timeout=30000`;

    const response = await sendRequest({
      url,
      method: 'GET',
    });

    const rows = response.split('\n');
    const emails: Array<{ email: string; status: string }> = [];

    for (const row of rows) {
      const rowArray = row.split(',');

      if (rowArray.length > 2) {
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

    const args = { action: MSG_QUEUE_ACTIONS.EMAIL_VERIFY, data: emails };

    await channel.assertQueue('engagesNotification');
    await channel.sendToQueue('engagesNotification', Buffer.from(JSON.stringify(args)));

    console.log('Successfully get the following emails : \n', emails);

    setTimeout(() => {
      channel.connection.close();

      disconnect();
      process.exit();
    }, 500);
  };

  const check = async () => {
    const argv = process.argv;

    if (argv.length < 3) {
      console.log('Please put taskId after yarn checkAndGetBulkEmails');

      disconnect();
      process.exit();
    }

    const taskId = argv[2];
    const type = await getConfig('emailVerificationType');

    if (!type) {
      console.log('Please configure EMAIL VERIFICATION TYPE');

      disconnect();
      process.exit();
    }

    switch (type) {
      case 'truemail': {
        const trueMailApiKey = await getConfig('trueMailApiKey');

        if (!trueMailApiKey) {
          console.log('Please configure TRUEMAIL API KEY');

          disconnect();
          process.exit();
        }

        const url = `https://truemail.io/api/v1/tasks/${taskId}/status?access_token=${trueMailApiKey}`;

        const response = await sendRequest({
          url,
          method: 'GET',
        });

        const data = JSON.parse(response).data;
        console.log(data);

        if (data.status === 'finished') {
          await getTrueMailBulk(taskId);
        } else {
          disconnect();
          process.exit();
        }

        break;
      }
    }
  };

  check();
});
