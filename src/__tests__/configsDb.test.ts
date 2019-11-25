import { configFactory } from './factories';
import './setup';

test('Configs model test', async done => {
  await configFactory({});

  done();
});
