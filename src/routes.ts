import configs from './api/configs';
import deliveryReports from './api/deliveryReports';
import engages from './api/engages';

const router = app => {
  // Insert routes below
  app.use('/engages', engages);
  app.use('/configs', configs);
  app.use('/deliveryReports', deliveryReports);
};

export default router;
