import { Router } from 'express';
import * as controller from '../controllers/configs';

const router = Router();

router.post('/save', controller.save);
router.get(`/detail`, controller.detail);

export default router;
