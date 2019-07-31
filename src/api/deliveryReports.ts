import { Router } from 'express';
import * as controller from '../controllers/deliveryReports';

const router = Router();

router.get('/statsList/:engageMessageId', controller.statsList);
router.get(`/reportsList/:engageMessageId`, controller.reportsList);

export default router;
