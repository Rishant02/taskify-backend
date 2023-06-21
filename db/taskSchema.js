const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema({
    tname: {
        type: String,
        trim: true,
        required:true
    },
    tdesc: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['OPEN', 'IN PROGRESS', 'CLOSED', 'ON HOLD', 'CANCELLED','COMPLETED'],
        default: 'OPEN'
    },
    completed:{
        type:Boolean,
        default:false
    },
    actualCloseDate:{
        type:Date,
    },
    dueDate:{
        type:Date,
        required:true
    },
    assignTo: [
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'User',
            required:true
        }
    ],
    startDate: {
        type: Date,
        default:Date.now()
    },
    isLate:{
        type:Boolean,
    },
    unread:{
        type:Number
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Task owner is required.']
    },
    taskUpdates:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'TaskUpdate'
        }
    ],
    attachment: [
        {
            url:String,
            filename:String
        }
    ],
    recurAmount:{
        type: Number,
        default:null
    }

}, { timestamps: true })

taskSchema.pre('save',async function(next){
    if(this.completed){
        this.actualCloseDate=Date.now()
    }else{
        this.actualCloseDate=undefined;
    }
    next();
})


module.exports = mongoose.model('Task', taskSchema);