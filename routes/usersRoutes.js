const express=require('express');
const catchAsync = require('../utils/catchAsync');
const router=express.Router();
const {getAllUser,getUser}=require('../controllers/userController')
const {isLoggedIn,isAuthor}=require('../middleware/middleware')

router.get('/',isLoggedIn,catchAsync(getAllUser))
router.get('/:userId',isLoggedIn,catchAsync(getUser))
router.delete('/:userId',isLoggedIn,isAuthor)

module.exports=router;