const User=require('../db/userSchema')
const jwt=require('jsonwebtoken')
const bcrypt=require('bcrypt')
const validator=require('validator')
const otplib = require('otplib')
const generateToken=require('../utils/generateVerificationToken')

const sendMail=require('../utils/sendMail')

const signToken=id=>{
    return jwt.sign({id},process.env.JWT_SECRET,{
        expiresIn:'30d'
    })
}

const verifyEmailOption=(user)=>{
    return {
        from:process.env.EMAIL_ADDRESS,
        to:user.email,
        subject:'Email Verification',
        template:'verificationEmail',
        context:{
            name:user.name,
            verifyToken:user.verificationToken
        }
    }
}
const resetPasswordEmailOption=(user)=>{
    return{
        from:process.env.EMAIL_ADDRESS,
        to:user.email,
        subject:'Reset Password',
        template:'resetPassword',
        context:{
            name:user.name,
            resetToken:user.passwordResetToken
        }
    }
}

module.exports.registerUser=async(req,res,next)=>{
    try{
        const {username,email,password,passwordConfirm,name,dept,emp_code}=req.body;
        if(password!==passwordConfirm){
            throw new Error('Password don\'t match.')
        }
        const hashedPwd=await bcrypt.hash(password,10);
        const verificationToken=generateToken();
        const verificationTokenExpiresAt=new Date();
        verificationTokenExpiresAt.setHours(verificationTokenExpiresAt.getHours()+3);
        const newUser=new User({username,email,password:hashedPwd,dept,emp_code,verificationToken,name,verificationTokenExpiresAt});
        newUser.passwordChanged=false;
        await newUser.save();
        sendMail(verifyEmailOption(newUser));
        const verificationMsg=`Please check your email inbox to verify your email address.Link will expires in 3 hrs.`
        newUser.password=undefined;
        const token=signToken(newUser._id);
        res.status(201).json({token,verificationMsg,data:newUser});
    }catch(err){
        next(err);
    }
}

module.exports.verifyEmail=async(req,res,next)=>{
    try {
        const {verifyToken}=req.query;
        if(!verifyToken){
            return res.status(400).send({error:'No verification token is found.'})
        }
        const user=await User.findOne({
            verificationToken:verifyToken
        })
        if(!user){
            return res.status(404).send({error:'Invalid verification token. Please sign up first.'})
        }
        if(user.verificationTokenExpiresAt<new Date()){
            user.verificationToken=generateToken();
            user.verificationTokenExpiresAt=new Date();
            user.verificationTokenExpiresAt.setHours(user.verificationTokenExpiresAt.getHours()+3)
            await user.save();
            sendMail(verifyEmailOption(user));
            return res.send('Verification token expired. A new verification token has been sent to your email address.')
        }
        user.isVerified=true
        user.verificationToken=undefined
        user.verificationTokenExpiresAt=undefined
        await user.save()
        return res.status(200).send({message:`${user.email} has been verified. You may login now.`})
    } catch (error) {
        next(error)
    }
}

module.exports.loginUser=async(req,res,next)=>{
    try{
        const {input,password}=req.body;
        const oldUser=validator.isEmail(input)?await User.findOne({email:input}).populate('tasks'):await User.findOne({emp_code:input}).populate('tasks')
        // const oldUser=await User.findOne({
        //     $or:[
        //         {email:input},
        //         {emp_code:input}
        //     ]
        // }).populate('tasks')
        if(!oldUser){
            throw new Error(`${input} does not exists. Try again or reset your password.`)
        }
        if(!oldUser.isVerified){
            throw new Error('Please verify your email address first.')
        }

        const match=oldUser.passwordChanged ? bcrypt.compareSync(password,oldUser.password):password===oldUser.password
        if(!match){
            throw new Error('Wrong username or password. Please try again or reset password.')
        }
        oldUser.password=undefined;
        const token=signToken(oldUser._id);
        res.status(200).json({
            token,
            data:oldUser
        })
    }catch(err){
        next(err);
    }
}

module.exports.forgotPasswordReq=async(req,res,next)=>{
    try{
        const {input}=req.body;
        if(!validator.isEmail(input)){
            throw new Error('Please enter a valid email address')
        }
        const user = await User.findOne({email:input})
        if(!user){
            throw new Error(`${input} does not exists. Please sign up first.`)
        }
        user.uniquePasswordToken = generateToken();
        user.isPasswordOTPVerified = false;
        user.passwordResetToken = otplib.authenticator.generate(user._id.toString())
        user.passwordResetTokenExpiresAt=new Date();
        user.passwordResetTokenExpiresAt.setMinutes(user.passwordResetTokenExpiresAt.getMinutes()+30)
        sendMail(resetPasswordEmailOption(user));
        await user.save();
        return res.status(200).json({passwordToken:user.uniquePasswordToken,message:`6 digit OTP has been sent to your email ${user.email}. OTP will expire in 30 minutes.`})
    }catch(err){
        next(err)
    }
}

module.exports.checkPasswordOTP=async(req,res,next)=>{
    try{
        const {resetToken}=req.params;
        const {otp}=req.body
        if(!resetToken){
            return res.status(404).json({error:"No reset token is found"})
        }
        const user=await User.findOne({
            uniquePasswordToken:resetToken
        })
        if(!user){
            return res.status(401).json({error:'Invalid reset token. Please sign up first.'})
        }
        if(!user.isVerified){
            return res.status(401).json({error:'User is not verified. Please verify email first'})
        }
        if(user.passwordResetTokenExpiresAt<new Date()){
            user.passwordResetToken=undefined
            user.passwordResetTokenExpiresAt=undefined
            user.uniquePasswordToken=undefined
            user.isPasswordOTPVerified = undefined
            await user.save();
            return res.status(401).json({error:'OTP is expired. Please send forgot password request again'})
        }
        if(user.passwordResetToken == otp){
            user.passwordResetToken=undefined
            user.passwordResetTokenExpiresAt=undefined
            user.isPasswordOTPVerified = true
            await user.save();
            return res.status(200).json({isOTPVerified:user.isPasswordOTPVerified,message:'OTP is verified. Please change your password.'})
        }
        return res.status(401).json({error:'Wrong OTP! Please try again or send another reset request'})
    }catch(err){
        next(err)
    }
}
module.exports.resetPassword=async(req,res,next)=>{
    try{
        const {resetToken}=req.params;
        const {password,passwordConfirm}=req.body;
        if(password!==passwordConfirm){
            throw new Error('Password do not match.')
        }
        if(!resetToken){
            return res.status(404).json({error:"No reset token is found"})
        }
        const user=await User.findOne({
            uniquePasswordToken:resetToken
        })
        if(!user){
            return res.status(401).json({error:'Invalid reset token. Please sign up first.'})
        }
        if(!user.isVerified){
            return res.status(401).json({error:'User is not verified. Please verify email first'})
        }
        if(!user.isPasswordOTPVerified){
            throw new Error('Please verify otp first before changing password')
        }
        if(user.passwordResetTokenExpiresAt<new Date()){
            user.passwordResetToken=undefined
            user.passwordResetTokenExpiresAt=undefined
            user.uniquePasswordToken=undefined
            user.isPasswordOTPVerified=undefined
            await user.save();
            return res.status(401).json({error:'Reset Token is expired. Please send forgot password request again'})
        }
        user.password=await bcrypt.hash(password,10);
        user.passwordResetToken=undefined
        user.passwordResetTokenExpiresAt=undefined
        user.uniquePasswordToken=undefined
        user.isPasswordOTPVerified=undefined
        await user.save();
        return res.status(203).json({message:'Password changed successfully. You can login now with new password.'})
    }catch(err){
        next(err);
    }
}

module.exports.firstLogin=async(req,res,next)=>{
    try{
        const {password,confirmPassword}=req.body
        const user=await User.findById(req.userID)
        if(!user.passwordChanged){
            if(!(password && confirmPassword)){
                return res.status(400).json({message:'All inputs must be filled.'})
            }
            if(password!==confirmPassword){
                return res.status(400).json({message:'Password don\'t match'})
            }
            const hashedPwd=await bcrypt.hash(password,10)
            user.password=hashedPwd
            user.passwordChanged=true
            await user.save()
            user.password=undefined;
            return res.status(200).json(user)
    }else{
        return res.status(403).json({error:'You have already updated your password'})
    }
    }catch(err){
        next(err)
    }
}

module.exports.changePassword=async(req,res,next)=>{
    try{
        const {oldPassword,newPassword,confirmNewPassword}=req.body;
        if(newPassword!==confirmNewPassword){
            return res.status(400).json({message:'Password don\'t match'})
        }
        const user=await User.findById(req.userID)
        const match=await bcrypt.compare(oldPassword,user.password)
        if(!match){
            return res.status(400).json({message:'Old password is wrong\nPlease try again or reset your password'})
        }
        user.password=await bcrypt.hash(newPassword,10);
        await user.save()
        return res.status(201).json({message:'Your password has been changed'})
    }catch(err){
        next(err)
    }
}


