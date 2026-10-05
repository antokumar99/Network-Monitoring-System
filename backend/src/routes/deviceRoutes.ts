import { Router } from 'express';
import {
  getAlerts,
  getDeviceById,
  getDeviceMetrics,
  getDevices,
  health,
  postDevice,
  putDevice,
  removeDevice,
} from '../controllers/deviceController';

const router = Router();

router.get('/health', health);

router.get('/devices', getDevices);
router.post('/devices', postDevice);
router.get('/devices/:id', getDeviceById);
router.put('/devices/:id', putDevice);
router.delete('/devices/:id', removeDevice);
router.get('/devices/:id/metrics', getDeviceMetrics);

router.get('/alerts', getAlerts);

export default router;
