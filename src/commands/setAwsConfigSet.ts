import * as dotenv from 'dotenv';
import * as mongoose from 'mongoose';
import { Configs } from '../models';
import { getEnv } from '../utils';

const start = () => {
  // load environment variables
  dotenv.config();

  const MONGO_URL = getEnv({ name: 'MONGO_URL' });

  mongoose.connect(MONGO_URL, { useNewUrlParser: true, useCreateIndex: true }, async () => {
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };

    await Configs.updateOne({ code: 'configSet' }, { $set: { value: process.argv[2] } }, options);
  });

  process.exit();
};

start();
