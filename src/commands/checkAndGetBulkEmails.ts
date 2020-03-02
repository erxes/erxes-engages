import { connect, disconnect } from '../connection';
import { MSG_QUEUE_ACTIONS, sendMessage } from '../messageQueue';
import { Emails } from '../models';
import { getEnv, sendRequest } from '../utils';

console.log(
  'Instruction: yarn checkAndGetBulkEmails taskId emailVerifierType. emailVerifierType`s default value is `truemail`',
);

const TRUEMAIL_API_KEY = getEnv({ name: 'TRUEMAIL_API_KEY' });

const getTrueMailBulk = async (taskId: string) => {
  connect()
    .then(async () => {
      const url = `https://truemail.io/api/v1/tasks/${taskId}/download?access_token=${TRUEMAIL_API_KEY}&timeout=30000`;

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

      sendMessage('engagesNotification', { action: MSG_QUEUE_ACTIONS.EMAIL_VERIFY, data: emails });
    })
    .then(() => {
      disconnect();

      process.exit();
    });
};

const check = async () => {
  const argv = process.argv;

  if (argv.length < 3) {
    throw new Error('Please put taskId after yarn checkAndGetBulkEmails');
  }

  const taskId = argv[2];
  const type = argv.length === 4 ? argv[3] : 'truemail';

  let output;

  switch (type) {
    case 'truemail': {
      if (!TRUEMAIL_API_KEY) {
        throw new Error('Please configure TRUEMAIL_API_KEY');
      }

      const url = `https://truemail.io/api/v1/tasks/${taskId}/status?access_token=${TRUEMAIL_API_KEY}`;

      const response = await sendRequest({
        url,
        method: 'GET',
      });

      output = JSON.parse(response).data;

      if (output.status === 'finished') {
        await getTrueMailBulk(taskId);
      } else {
        process.exit();
      }
    }
  }

  console.log(output);
};

check();
