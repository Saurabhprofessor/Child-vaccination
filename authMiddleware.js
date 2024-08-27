const isUser = (req,res,next)=>{
if(req.isAuthenticated()){
    next();
}else{
    res.status(401).json({msg:'you are not authorized to view the resource'})
}
};


const isAdmin=(req,res,next)=>{
    if(req.isAuthenticated() && req.user.admin){
        next();
    }else{
        res.status(401).json({msg:'only admin is authorized to access this resource'})
    }
}

const isUserOrAdmin = (req,res,next)=>{
    if(req.isAuthenticated()){
        if (req.user.admin) {
            return isAdmin(req,res,next);
        } else {
            return isUser(req,res,next);
        }
    }
}
module.exports ={isAdmin,isUser,isUserOrAdmin};