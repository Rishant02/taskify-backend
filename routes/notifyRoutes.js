const express=require('express');
const router=express.Router()
const { isLoggedIn } = require('../middleware/middleware');
const catchAsync=require('../utils/catchAsync')
const {getAllNotification,getNotificationByTask}=require('../controllers/notificationController')

router.get('/',isLoggedIn,catchAsync(getAllNotification))
router.get('/:taskId',isLoggedIn,catchAsync(getNotificationByTask))

module.exports=router;