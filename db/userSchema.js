const mongoose = require('mongoose')
const validator = require('validator')

const userSchema = new mongoose.Schema({
    // username: {
    //     type: String,
    //     trim: true,
    //     required: [true, 'Enter a username.'],
    //     unique: [true, 'That username is already taken.'],
    //     lowercase: true,
    //     validate: [validator.isAlphanumeric, 'Username may only have letters and numbers.']
    // },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        // unique: [true, 'That email address is already taken.'],
        // required: [true, 'Enter an email address.'],
        // validate: [validator.isEmail, 'Enter a valid email address.']
    },
    emp_code:{
        type:Number,
        unique: [true, 'That employee code is already taken.'],
        required: [true, 'Enter an employee code'],
    },
    dept:{
        type:String,
        trim:true,
        required: [true, 'Enter a department'],
    },
    password: {
        type: String,
        minlength: [6, 'Password should be at least 6 characters.'],
        trim: true,
        required: [true, 'Enter a password.']
    },
    name: {
        type: String,
        trim: true,
    },
    avatar: {
        type: String,
    },
    passwordChanged:{
        type:Boolean,
        default:false
    },
    isVerified:{
        type:Boolean,
        default:false
    },
    verificationToken:{
        type:String,
    },
    verificationTokenExpiresAt:{
        type:Date,
    },
    isPasswordOTPVerified:{
        type:Boolean,
    },
    uniquePasswordToken:{
        type:String,
    },
    passwordResetToken:{
        type:String,
    },
    passwordResetTokenExpiresAt:{
        type:Date
    },
    tasks:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'Task',
        }
    ],
    // taskUpdatesRead:[
    //     {
    //         type:mongoose.Schema.Types.ObjectId,
    //         ref:'TaskUpdate'
    //     },
    // ],
}, { timestamps: true, toJSON: { virtuals: true } })


// userSchema.pre('save', async function (next) {
//     if (!this.name) {
//         this.name = this.username
//     }
//     next();
// })

// userSchema.statics.signIn=async function(input,plainPassword){
//     const oldUser=await this.findOne({
//         $or:[
//             { email: input},
//             { username: input}
//         ]
//     })
//     if(!oldUser){
//         throw new Error(`${input} does not exists. Please sign up first`)
//     }
//     const match = await bcrypt.compare(plainPassword,oldUser.password);
//     if(!match){
//         throw new Error('Wrong username or password. Try again or reset your password.')
//     }
//     return oldUser;
// }


module.exports = mongoose.model('User', userSchema);;
