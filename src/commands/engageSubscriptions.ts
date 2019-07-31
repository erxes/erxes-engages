import * as dotenv from 'dotenv';
import * as mongoose from 'mongoose';
import { getApi } from '../trackers/engageTracker';
import { getEnv } from '../utils';

const start = () => {
  // load environment variables
  dotenv.config();

  const MONGO_URL = getEnv({ name: 'MONGO_URL' });
  const DOMAIN = getEnv({ name: 'DOMAIN' });
  const AWS_CONFIG_SET = getEnv({ name: 'AWS_CONFIG_SET' });

  let topicArn = '';

  mongoose.connect(MONGO_URL, { useNewUrlParser: true, useCreateIndex: true }, async () => {
    const snsApi = await getApi('sns');
    const sesApi = await getApi('ses');

    // Automatically creating aws configs
    snsApi
      // Create Topic
      .createTopic({ Name: AWS_CONFIG_SET })
      .promise()
      // Subscribing to the topic
      .then(result => {
        topicArn = result.TopicArn;

        return snsApi
          .subscribe({
            TopicArn: topicArn,
            Protocol: 'https',
            Endpoint: `${DOMAIN}/service/engage/tracker`,
          })
          .promise();
      })
      // Creating configuration set
      .then(() => {
        console.log('Successfully subscribed to the topic');

        return sesApi
          .createConfigurationSet({
            ConfigurationSet: {
              Name: AWS_CONFIG_SET,
            },
          })
          .promise();
      })
      .catch(error => {
        console.log(error.message);
      })
      // Creating event destination for configuration set
      .then(() => {
        console.log('Successfully created config set');

        return sesApi
          .createConfigurationSetEventDestination({
            ConfigurationSetName: AWS_CONFIG_SET,
            EventDestination: {
              MatchingEventTypes: [
                'send',
                'reject',
                'bounce',
                'complaint',
                'delivery',
                'open',
                'click',
                'renderingFailure',
              ],
              Name: AWS_CONFIG_SET,
              Enabled: true,
              SNSDestination: {
                TopicARN: topicArn,
              },
            },
          })
          .promise();
      })
      .catch(error => {
        console.log(error.message);
      });
  });
};

start();
