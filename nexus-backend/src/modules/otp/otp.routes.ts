import { Router } from 'express';
import { otpController } from './otp.controller';

const router = Router();

router.post('/send-otp', otpController.sendOtp);
router.post('/verify-otp', otpController.verifyOtp);
router.post('/check-email', otpController.checkEmail);

export default router;
