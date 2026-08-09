import { Router } from 'express';
import { otpController } from './otp.controller';

const router = Router();

router.post('/send-otp', otpController.sendOtp);
router.post('/verify-otp', otpController.verifyOtp);
router.post('/check-email', otpController.checkEmail);
router.post('/check-account', otpController.checkAccount);
router.post('/send-otp-login', otpController.sendOtpLogin);
router.post('/verify-otp-login', otpController.verifyOtpLogin);

export default router;
