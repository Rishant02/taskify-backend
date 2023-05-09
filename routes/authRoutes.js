const express=require('express')
const router=express.Router();
const catchAsync=require('../utils/catchAsync')
const {isLoggedIn}=require('../middleware/middleware')
const {registerUser,loginUser,verifyEmail,forgotPasswordReq,checkPasswordOTP,resetPassword,firstLogin,changePassword}=require('../controllers/authController')

router.get('/verify',catchAsync(verifyEmail))
router.post('/register',catchAsync(registerUser));
router.post('/login',catchAsync(loginUser));
router.post('/forgot-req',catchAsync(forgotPasswordReq))
router.post('/check-otp/:resetToken',catchAsync(checkPasswordOTP))
router.post('/reset/:resetToken',catchAsync(resetPassword));
router.post('/first',isLoggedIn,catchAsync(firstLogin))
router.post('/change',isLoggedIn,catchAsync(changePassword))

module.exports=router;