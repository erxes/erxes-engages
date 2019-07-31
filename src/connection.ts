import * as dotenv from 'dotenv';
import mongoose = require('mongoose');
import { getEnv } from './utils';
import { debugDb } from './utils/debuggers';

dotenv.config();

mongoose.Promise = global.Promise;
mongoose.set('useFindAndModify', false);

export const connect = () => {
  const URI = getEnv({ name: 'MONGO_URL' });
  mongoose.connect(URI, { useNewUrlParser: true, useCreateIndex: true });

  mongoose.connection
    .on('connected', () => {
      debugDb(`Connected to the database: ${URI}`);
    })
    .on('disconnected', () => {
      debugDb(`Disconnected from the database: ${URI}`);
    })
    .on('error', error => {
      debugDb(`Database connection error: ${URI}`, error);
    });
};
