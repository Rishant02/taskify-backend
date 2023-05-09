const mongoose=require('mongoose')

const taskUpdateSchema = new mongoose.Schema({
    taskId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Task',
        required:true
    },
    updatedBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    updateReason:{
        type:String,
        required:true
    },
    committedDate:{
        type:Date
    },
    updateStatus: {
        type: String,
        enum: ['OPEN', 'IN PROGRESS', 'CANCELLED', 'ON HOLD', 'CLOSED'],
        default: 'OPEN'
    },
    attachment: [
        {
            url:String,
            filename:String
        }
    ],
},{timestamps:true})

module.exports=mongoose.model('TaskUpdate',taskUpdateSchema);