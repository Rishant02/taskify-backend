const Notification=require('../db/notificationSchema')
const Task = require('../db/taskSchema')
module.exports.getAllNotification=async(req,res,next)=>{
    try{
        const notifys=await Notification.find({recipient:req.userID})
        const unread=notifys.filter((obj)=>obj.read===false).length
        return res.status(200).json({notifys,unread,read:notifys.length-unread})
    }catch(err){
        next(err)
    }
}

module.exports.getNotificationByTask=async(req,res,next)=>{
    try{
        const {taskId}=req.params;
        const task=await Task.findById(taskId)
        let taskNotification=[]
        task.taskUpdates.forEach(async(tUpdate)=>{
            const notifys=await Notification.findOne({taskUpdate:tUpdate._id})
            taskNotification.push(notifys)
        })
        const unread=taskNotification.filter((data)=>data?.read===false).length
        return res.status(200).json({taskNotification,unread,read:taskNotification.length-unread})
    }catch(err){
        next(err)
    }
}