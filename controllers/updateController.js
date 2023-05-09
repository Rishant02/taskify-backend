const TaskUpdate=require('../db/taskUpdateSchema')
const Task=require('../db/taskSchema')
const Notification=require('../db/notificationSchema')
const sendMail=require('../utils/sendMail')
const User = require('../db/userSchema')

const taskUpdateEmail=(updatedBy,toEmail,task,updateTask)=>{
    return{
        from:process.env.EMAIL_ADDRESS,
        to:toEmail,
        subject:`${updatedBy} updates the task [${task.tname}]`,
        template:'updateTaskEmail',
        context:{
            tname:task.tname,
            authorName:task.author.name,
            updateReason:updateTask.updateReason,
            committedDate:new Date(updateTask.committedDate).toLocaleDateString(),
            dueDate:new Date(task.dueDate).toLocaleDateString(),
            updateStatus:updateTask.updateStatus
        }
    }
}
module.exports.getTaskUpdate=async(req,res,next)=>{
    try{
        const {taskId}=req.params;
        const taskUpdates=await TaskUpdate.find({
            taskId:taskId
        }).populate('taskId').populate('updatedBy','-password').sort({_id:-1})
        taskUpdates.forEach(async(tUpdate)=>{
           const data=await Notification.findOneAndUpdate(
                {recipient:req.userID,taskUpdate:tUpdate._id},
                {read:true},
                {new:true}
            )
            if(data){
                await Notification.findByIdAndDelete(data._id)
            }
        })
        return res.status(200).json(taskUpdates)
    }catch(err){
        next(err)
    }
}

module.exports.createTaskUpdate=async(req,res,next)=>{
    try{
        const {taskId}=req.params;
        const {updateReason,committedDate,updateStatus}=req.body;
        const task=await Task.findById(taskId)
        if(!task.assignTo.concat([task.author].includes(req.userID))){
            return res.status(403).json({message:'You are not allowed to update status'})
        }
        const newUpdate=new TaskUpdate({taskId,updateReason,updatedBy:req.userID,committedDate,updateStatus})
        newUpdate.attachment=req?.files?.map(f=>({url:f.path,filename:f.filename}))
        const updatedTask=await Task.findByIdAndUpdate(taskId,{$push:{taskUpdates:newUpdate._id},status:updateStatus},{new:true}).populate('author');
        const updateAuthor=await User.findById(req.userID)
        if(newUpdate.updatedBy.equals(task.author)){
            task.assignTo.forEach(async(user)=>{
                const notifys=new Notification({recipient:user._id,taskUpdate:newUpdate._id})
                await notifys.save()
                const userEmail=await User.findById(user._id).select({'email':1,_id:0})
                sendMail(taskUpdateEmail(updateAuthor.name,userEmail,updatedTask,newUpdate))
            })
        }else{
            task.assignTo.filter((data)=>!data._id.equals(req.userID)).concat([task.author]).forEach(async(user)=>{
                const notifys=new Notification({recipient:user._id,taskUpdate:newUpdate._id})
                await notifys.save()
                const userEmail=await User.findById(user._id).select({'email':1,_id:0})
                sendMail(taskUpdateEmail(updateAuthor.name,userEmail,updatedTask,newUpdate))
            })
        }
        if(committedDate){
            await Task.findByIdAndUpdate(taskId,{dueDate:committedDate})
        }
        await newUpdate.save()
        return res.status(201).json(newUpdate)
    }catch(err){
        next(err)
    }
}