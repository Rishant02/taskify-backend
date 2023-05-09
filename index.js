if (process.env.NODE_ENV !== 'production'){
  require('dotenv').config()
}
require('./db/conn')
const express=require('express')
const cors=require('cors');
const ExpressError=require('./utils/expressError')
const ErrorHandler=require('./middleware/errorHandler')
const authRouter=require('./routes/authRoutes')
const taskRouter=require('./routes/taskRoutes')
const userRouter=require('./routes/usersRoutes')
const updateRouter=require('./routes/updateRoutes')
const notifyRouter=require('./routes/notifyRoutes')
const app=express();
const port=process.env.PORT || 3500;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.get('/',(req,res)=>{
  return res.json({message:"Welcome to taskify api"})
})
app.use('/api/auth',authRouter);
app.use('/api/tasks',taskRouter);
app.use('/api/users',userRouter);
app.use('/api/update',updateRouter);
app.use('/api/notify',notifyRouter);

app.get('*',(req,res,next)=>{
  next(new ExpressError('Page not found',404));
})

app.use(ErrorHandler);

app.listen(port,()=>{
  console.log(`Server is running on ${port} port`)
})