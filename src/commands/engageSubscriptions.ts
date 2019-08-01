import * as dotenv from 'dotenv';
import * as mongoose from 'mongoose';
import { Configs } from '../models';
import { getApi } from '../trackers/engageTracker';
import { getEnv } from '../utils';

const start = () => {
  // load environment variables
  dotenv.config();

  const MONGO_URL = getEnv({ name: 'MONGO_URL' });
  const MAIN_API_DOMAIN = getEnv({ name: 'MAIN_API_DOMAIN' });

  let topicArn = '';

  mongoose.connect(MONGO_URL, { useNewUrlParser: true, useCreateIndex: true }, async () => {
    const snsApi = await getApi('sns');
    const sesApi = await getApi('ses');
    const configSetDb = await Configs.findOne({ code: 'configSet' });
    const configSet = configSetDb.value;

    // Automatically creating aws configs
    snsApi
      // Create Topic
      .createTopic({ Name: configSet })
      .promise()
      // Subscribing to the topic
      .then(result => {
        topicArn = result.TopicArn;

        return snsApi
          .subscribe({
            TopicArn: topicArn,
            Protocol: 'https',
            Endpoint: `${MAIN_API_DOMAIN}/service/engage/tracker`,
          })
          .promise();
      })
      // Creating configuration set
      .then(() => {
        console.log('Successfully subscribed to the topic');

        return sesApi
          .createConfigurationSet({
            ConfigurationSet: {
              Name: configSet,
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
            ConfigurationSetName: configSet,
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
              Name: configSet,
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
