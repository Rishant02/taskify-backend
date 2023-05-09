const jwt=require('jsonwebtoken')
const Task=require('../db/taskSchema')
const User=require('../db/userSchema')

module.exports.isLoggedIn = async(req, res, next) => {
    try{
        const bearerHeader = req.headers['authorization']
        if (typeof bearerHeader !== 'undefined') {
            const token = bearerHeader.split(' ')[1]
            const decoded=jwt.verify(token,process.env.JWT_SECRET)
            const user=await User.findById(decoded?.id)
            if(!user){
                return res.status(404).json({error:'Account does not exists. Please sign up first.'})
            }
            if(!user.isVerified){
                return res.status(401).json({error:'Verify your email address first.'})
            }
            req.userID=decoded?.id
            next();
        } else {
            return res.status(401).json({message:"empty login token. Please login again."});
    }
    }catch(err){
        next(err);
    }
}

module.exports.isAuthor=async(req,res,next)=>{
    try{
        const {taskId}=req.params;
        const task=await Task.findById(taskId);
        if(task.author.equals(req.userID)){
            next();
        }else{
            res.sendStatus(403);
        }
    }catch(err){
        next(err);
    }
}

