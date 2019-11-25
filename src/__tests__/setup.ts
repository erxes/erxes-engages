import * as dotenv from 'dotenv';
import * as mongoose from 'mongoose';

dotenv.config();

const getCollections = () => {
  return Object.keys(mongoose.connection.collections);
};

const getCollectionByName = collectionName => {
  return mongoose.connection.collections[collectionName];
};

beforeAll(async done => {
  await mongoose.connect(process.env.TEST_MONGO_URL);

  done();
});

afterEach(async () => {
  for (const collectionName of getCollections()) {
    await getCollectionByName(collectionName).deleteMany({});
  }
});

afterAll(async () => {
  for (const collectionName of getCollections()) {
    try {
      await getCollectionByName(collectionName).drop();
    } catch (error) {
      if (error.message === 'ns not found') {
        return;
      }
    }
  }

  mongoose.connection.close();
});
