import { Router } from 'express';
import * as controller from '../controllers/engages';

const router = Router();

router.post('/send', controller.send);

export default router;
