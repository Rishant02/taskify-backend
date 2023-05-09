const mongoose=require('mongoose')


const subTaskSchema=new mongoose.Schema({
    stName:{
        type:String,
        required:true
    },
    stCompleted:{
        type:Boolean,
        default:false
    },
    parentTask:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Task',
        required:true
    }
},{timestamps:true})

module.exports=mongoose.model('SubTask',subTaskSchema);