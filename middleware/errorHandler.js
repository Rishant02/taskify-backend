const ErrorHandler=(err,req,res,next)=>{
    console.log("Middleware error handling")
    const errStatus=err.statusCode || 500;
    const errMessage=err.message || "Something went wrong";
    if(err.name==='ValidationError'){
        let errors=Object.values(err.errors).map(el=>el.message);
        let fields=Object.values(err.errors).map(el=>el.path)
        let code=400;
        if(errors.length>1){
            const formattedErrors=errors.join(' ');
            return res.status(code).json({
                success:false,
                status:code,
                message:formattedErrors,
                fields:fields,
                stack: process.env.NODE_ENV === 'development'?err.stack:{}
            })
        }else{
            return res.status(code).json({
                success:false,
                status:code,
                message:errors,
                fields:fields,
                stack: process.env.NODE_ENV === 'development'?err.stack:{}
            })
        }
    }
    if(err.code && err.code===11000){
        const field=Object.keys(err.keyValue);
        const code=409;
        const error=`An account with ${field} already exists.`
        return res.status(code).json({
            success:false,
            status:code,
            message:error,
            fields:field,
            stack: process.env.NODE_ENV === 'development'?err.stack:{}
        })
    }
    return res.status(errStatus).json({
        success:false,
        status:errStatus,
        message:errMessage,
        stack: process.env.NODE_ENV === 'development'?err.stack:{}
    })
}
module.exports=ErrorHandler;
