const mongoose=require('mongoose')
mongoose.set('strictQuery',true)
mongoose.connect(process.env.MONGO_URI,{
    useUnifiedTopology:true
}).then(()=>{
    console.log("MongoDB has been connected.")
}).catch((err)=>{
    console.log(err.message)
})