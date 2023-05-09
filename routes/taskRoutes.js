const express = require('express')
const router = express.Router();
const { getAllTasks, createTask,getTask,updateTask,markComplete,deleteTask,updateStatus}= require('../controllers/tasksController')
const {isLoggedIn,isAuthor}=require('../middleware/middleware')
const catchAsync = require('../utils/catchAsync')
const { attachStorage } = require('../cloudinary/index')
const multer = require('multer')
const attachUpload = multer({ storage: attachStorage })

router.get('/', isLoggedIn, catchAsync(getAllTasks))
router.post('/', isLoggedIn, catchAsync(createTask))
router.get('/:taskId',isLoggedIn,catchAsync(getTask))
// router.put('/:taskId',isLoggedIn,isAuthor,attachUpload.array('attachment'),catchAsync(updateTask))
router.get('/complete/:taskId',isLoggedIn,isAuthor,catchAsync(markComplete))
router.patch('/status/:taskId',isLoggedIn,isAuthor,catchAsync(updateStatus))
router.delete('/:taskId',isLoggedIn,isAuthor,catchAsync(deleteTask))

module.exports = router;