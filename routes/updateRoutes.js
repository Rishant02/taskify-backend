const express=require('express')
const router=express.Router()
const {isLoggedIn}=require('../middleware/middleware')
const { attachStorage } = require('../cloudinary/index')
const multer = require('multer')
const attachUpload = multer({ storage: attachStorage })
const catchAsync=require('../utils/catchAsync')
const { createTaskUpdate,getTaskUpdate } = require('../controllers/updateController')

router.get('/:taskId',isLoggedIn,catchAsync(getTaskUpdate))
router.post('/:taskId',isLoggedIn,attachUpload.array('attachment'),catchAsync(createTaskUpdate))

module.exports=router;