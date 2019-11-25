import * as faker from 'faker';
import { Configs } from '../models';

export const configFactory = params => {
  const configObj = new Configs({
    code: params.code || faker.random.word(),
    value: params.value || faker.random.word(),
  });

  return configObj.save();
};
