const Users = require('../db/userSchema')
const Tasks = require('../db/taskSchema')
const TaskUpdate=require('../db/taskUpdateSchema')
const ObjectId=require('mongoose').Types.ObjectId;
const {cloudinary}=require('../cloudinary/index');
const sendMail=require('../utils/sendMail')
const Notification = require('../db/notificationSchema');

const createTaskMail=(task,toEmail,creatorName)=>{
    return{
        from:process.env.EMAIL_ADDRESS,
        to:toEmail,
        subject:`${creatorName} assigned a task to you [${task.tname}]`,
        template:'createTaskEmail',
        context:{
            tid:task.id,
            tname:task.tname,
            tdesc:task.tdesc,
            startDate:new Date(task.startDate).toLocaleDateString(),
            dueDate:new Date(task.dueDate).toLocaleDateString(),
            status:task.status
        }
    }
}

module.exports.getAllTasks = async (req, res, next) => {
    try {
        const {byLoggedUser,showDeptWise}=req.query;
        let tasks;
        if(byLoggedUser){
            tasks = await Tasks.find({author:req.userID})
                .populate('author','-password')
                .populate('assignTo','-password')
                .sort({_id:-1})
        }else if(showDeptWise){
          const loggedUser = await Users.findById(req.userID)
          if(loggedUser.role !== 'department head'){
            throw new Error('You don\'t have enough permission to access this')
          }
          const userIds = await Users.find({dept:loggedUser?.dept}).select('_id')
          tasks = await Tasks.find({
            $or: [
              {
                $and: [
                  { author: { $in: userIds } },
                  {
                    $expr: {
                      $and: [
                        { $gt: [{ $size: '$assignTo' }, 0] },
                        {
                          $not: {
                            $anyElementTrue: {
                              $map: {
                                input: '$assignTo',
                                as: 'assignee',
                                in: { $eq: ['$$assignee', '$author'] }
                              }
                            }
                          }
                        }
                      ]
                    }
                  }
                ]
              },
              {
                $and: [
                  { author: req.userID },
                  { assignTo: req.userID }
                ]
              }
            ]
          })
            .populate('author', '-password')
            .populate('assignTo', '-password')
            .sort({ _id: -1 });
        }
        else{
            tasks = await Tasks.find({
                $or:[
                    {author:req.userID},
                    {assignTo:{$elemMatch:{$eq:req.userID}}}
                ]
            })
            .populate('author','-password')
            .populate('assignTo','-password')
            .sort({_id:-1})
        }
        const pipeline = [
            {
              $match: { _id: { $in: tasks.map(task => task._id) } }
            },
            {
              $addFields: {
                isLate: {
                  $cond: [
                    {
                      $and: [
                        { $in: ['$status', ['OPEN', 'IN PROGRESS']] },
                        { $gt: [new Date(), { $add: ['$dueDate', 24 * 60 * 60 * 1000] }] }
                      ]
                    },
                    true,
                    false
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                numOwnedTasks: {
                  $sum: { $cond: [{ $eq: [{$toString: '$author'}, req.userID] }, 1, 0] }
                },
                numOpenedTasks: {
                  $sum: { $cond: [{ $eq: ['$status', 'OPEN'] }, 1, 0] }
                },
                numProgressTasks: {
                  $sum: { $cond: [{ $eq: ['$status', 'IN PROGRESS'] }, 1, 0] }
                },
                numClosedTasks: {
                  $sum: { $cond: [{ $eq: ['$status', 'CLOSED'] }, 1, 0] }
                },
                numHoldTasks: {
                  $sum: { $cond: [{ $eq: ['$status', 'ON HOLD'] }, 1, 0] }
                },
                numCompletedTasks: {
                  $sum: { $cond: [{ $eq: ['$completed', true] }, 1, 0] }
                },
                totalLateTasks: { $sum: { $cond: ['$isLate', 1, 0] } }
              }
            },
            {
              $project: {
                _id: 0,
                numOwnedTasks: 1,
                numOpenedTasks: 1,
                numProgressTasks: 1,
                numClosedTasks: 1,
                numHoldTasks: 1,
                numCompletedTasks: 1,
                totalLateTasks: 1
              }
            }
        ];  
        const taskStats = await Tasks.aggregate(pipeline)
        const notifys = await Notification.find({recipient:req.userID})
        tasks.forEach((task)=>{
            const modDate = new Date(task.dueDate)
            if(Date.now()>modDate.setDate(modDate.getDate()+1)){
                task.isLate = true
            }else{
                task.isLate = false
            }
            const unreadNotification = task.taskUpdates.reduce((unread,update)=>{
                const data = notifys.filter((notify)=>notify.taskUpdate.equals(update._id)&& notify.read===false)
                return unread + data.length
            },0);

            task.unread=unreadNotification;

        })
        const stats = taskStats.length > 0
                    ? taskStats[0]
                    : {
                        numOwnedTask: 0,
                        numOpenedTask: 0,
                        numProgressTask: 0,
                        numClosedTask: 0,
                        numHoldTask: 0,
                        numCompletedTask: 0,
                        totalLateTasks: 0,
                    };
        return res.status(200).json({stats,tasks})
        // if(byLoggedUser){
        //     const tasks=await Tasks.find({
        //         author:req.userID
        //     }).populate('author','-password').populate('assignTo','-password').sort({_id:-1})
        //     const notifys=await Notification.find({recipient:req.userID})
        //     let numOwnedTask,numOpenedTask,numProgressTask,numClosedTask,numHoldTask,numCompletedTask;
        //     numOwnedTask=numOpenedTask=numProgressTask=numCompletedTask=numHoldTask=numClosedTask=0;
        //     tasks.forEach(async(task)=>{
        //         if(task.author._id.equals(req.userID)) numOwnedTask+=1
        //         if(task.completed) numCompletedTask+=1
        //         if(task.status==='OPEN') numOpenedTask+=1
        //         if(task.status==='IN PROGRESS') numProgressTask+=1
        //         if(task.status==='CLOSED') numClosedTask+=1
        //         if(task.status==='ON HOLD') numHoldTask+=1
        //         const modDate=new Date(task.dueDate)
        //         if(Date.now()>modDate.setDate(modDate.getDate()+1)){
        //             task.isLate=true
        //         }else{
        //             task.isLate=false
        //         }
        //         let unreadNotification=0;
        //         task.taskUpdates.forEach((update)=>{
        //             const data= notifys.filter((notify)=>notify.taskUpdate.equals(update._id) && notify.read===false)
        //             unreadNotification+=data.length
        //         })
        //         task.unread=unreadNotification;
        //     })
        //     const stats={numOwnedTask,numOpenedTask,numProgressTask,numClosedTask,numHoldTask,numCompletedTask}
        //     return res.status(200).json({stats,tasks});
        // }
        // const tasks = await Tasks.find({
        //     $or:[
        //         {author:req.userID},
        //         {assignTo:{$elemMatch:{$eq:req.userID}}}
        //     ]
        // }).populate('author','-password').populate('assignTo','-password').sort({_id:-1});
        // const notifys=await Notification.find({recipient:req.userID})
        // let numOwnedTask,numOpenedTask,numProgressTask,numClosedTask,numHoldTask,numCompletedTask;
        //     numOwnedTask=numOpenedTask=numProgressTask=numCompletedTask=numHoldTask=numClosedTask=0;
        //     tasks.forEach(async(task)=>{
        //         if(task.author._id.equals(req.userID)) numOwnedTask+=1
        //         if(task.completed) numCompletedTask+=1
        //         if(task.status==='OPEN') numOpenedTask+=1
        //         if(task.status==='IN PROGRESS') numProgressTask+=1
        //         if(task.status==='CLOSED') numClosedTask+=1
        //         if(task.status==='ON HOLD') numHoldTask+=1
        //         const modDate=new Date(task.dueDate)
        //         if(Date.now()>modDate.setDate(modDate.getDate()+1)){
        //             task.isLate=true
        //         }else{
        //             task.isLate=false
        //         }
        //         let unreadNotification=0;
        //         task.taskUpdates.forEach((update)=>{
        //             const data= notifys.filter((notify)=>notify.taskUpdate.equals(update._id) && notify.read===false)
        //             unreadNotification+=data.length
        //         })
        //         task.unread=unreadNotification;
        //     })
        //     const stats={numOwnedTask,numOpenedTask,numProgressTask,numClosedTask,numHoldTask,numCompletedTask}
        //     return res.status(200).json({stats,tasks});
    } catch (err) {
        next(err);
    }
}

module.exports.getTask=async(req,res,next)=>{
    try{
        const {taskId}=req.params;
        if(!ObjectId.isValid(taskId)){
            throw new Error('Invalid ID of task');
        }
        const task=await Tasks.findById(taskId).populate('author','-password').populate('assignTo','-password').populate('taskUpdates');
        return res.status(200).json(task);
    }catch(err){  
        next(err);
    }
}



// AssignTo should change from string to Array at last.


module.exports.createTask = async (req, res, next) => {
    try {
        const { tname, tdesc, status, startDate,dueDate,assignTo} = req.body;
        const newTask = new Tasks({ tname, tdesc, status, startDate, dueDate, assignTo });
        if(!startDate){
            newTask.startDate=new Date().toISOString()
        }
        if(startDate && startDate>dueDate){
            throw new Error('Start date must be higher than current time')
        }
        if(newTask.startDate>dueDate){
            throw new Error('Due date must be higher than current time')
        }
        if(assignTo.length === 0){
            throw new Error('You must assign task to atleast 1 employee')
        }
        newTask.author = req.userID;
        // newTask.attachment = req.files.map(f => ({ url: f.path, filename: f.filename }))
        if (assignTo) {
            // if(assignTo.includes(req.userID)){
            //     throw new Error('You can not assign a task to yourself.')
            // }
            assignTo?.forEach(async(userId)=>{
                await Users.findByIdAndUpdate(userId,{$push:{tasks:newTask._id}})
            })
        }
        await Users.findByIdAndUpdate(newTask.author,{
            $push:{
                tasks:newTask._id
            }
        })
        await newTask.save();
        const author=await Users.findById(req.userID)
        newTask.assignTo.forEach(async(user)=>{
            const assignee=await Users.findById(user._id)
            sendMail(createTaskMail(newTask,assignee.email,author.name))
        })
        return res.status(201).json(newTask)
    } catch (err) {
        next(err);
    }
}
// module.exports.updateTask=async(req,res,next)=>{
//     try{
//         const {taskId}=req.params;
//         const { tname, tdesc, status, priority, startDate, dueDate,assignTo,deleteAttach}=req.body;
//         const task=await Tasks.findOneAndUpdate({
//             _id:taskId,
//             author:req.userID
//         },
//         {tname,tdesc,status,priority,startDate,dueDate,startDate})
//         const files=req.files.map(f=>({url:f.path,filename:f.filename}))
//         task.attachment.push(...files);
//         if(assignTo){
//             const assignList=assignTo.split(';');
//             assignList.forEach(async userId=>{
//                 if(!userId in task.assignTo){
//                     task.assignTo.push(userId);
//                     await Users.findByIdAndUpdate(userId,{$push:{tasks:task._id}})
//                 }
//             })
//         }
//         await task.save();
//         if(deleteAttach){
//             deleteAttach.forEach(filename=>cloudinary.uploader.destroy(filename))
//             await task.updateOne({$pull:{attachment:{filename:{$in:deleteAttach}}}})
//         }
//     }catch(err){
//         next(err)
//     }
// }

// Update Status

module.exports.updateStatus=async(req,res,next)=>{
    try{
        const {taskId}=req.params;
        const {newStatus}=req.body;
        const task=await Tasks.findById(taskId);
        task.status=newStatus;
        await task.save()
        return res.status(201).json(task)
    }catch(err){
        next(err)
    }
}

module.exports.markComplete=async(req,res,next)=>{
    try{
        const {taskId}=req.params;
        const task=await Tasks.findById(taskId)
        if(['CANCELLED', 'ON HOLD'].includes(task?.status)){
            return res.status(400).json({message:'You can not mark task complete if status is on hold or cancelled'})
        }
        if(task.completed){
            task.completed=false
            task.status='OPEN'
            await task.save()
            return res.status(200).json({message:'Task marked as incomplete'})
        }else{
            task.completed=true
            task.status='COMPLETED'
            await task.save()
            return res.status(200).json({message:'Task marked as complete'})
        }
    }catch{
        next(err);
    }
}

module.exports.deleteTask=async(req,res,next)=>{
    try{
        const {taskId}=req.params;
        const task=await Tasks.findByIdAndDelete(taskId)
        await Notification.deleteMany({taskUpdate:{ $in : task.taskUpdates }})
        await TaskUpdate.deleteMany({_id:{$in:task.taskUpdates}})
        const userIds = [task.author,...task.assignTo]
        await Users.updateMany({_id:{$in:userIds}},{$pull:{tasks:taskId}})
        task.attachment.forEach(async obj=>{
            await cloudinary.uploader.destroy(obj.filename);
        })
        return res.status(200).json(task)
    }catch(err){
        next(err);
    }
}