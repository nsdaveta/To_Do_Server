const express=require('express');
const ToDoRouter=express.Router();
const auth = require('../middleware/auth.js');

const {
    ToDo,
    Add_ToDo,
    Update_ToDo,
    Delete_ToDo,
    Register,
    VerifyOTP,
    Login,
    Logout,
    ResendOTP,
    ForgotPassword,
    ResetPassword,
    CheckUserStatus
} = require('../controller/ToDoController.js');

// ToDo Routes (URL=> http://localhost:4000/todos/)
ToDoRouter.get('/', auth, ToDo);
ToDoRouter.post('/add', auth, Add_ToDo);
ToDoRouter.put('/update/:id', auth, Update_ToDo);
ToDoRouter.delete('/delete/:id', auth, Delete_ToDo);

// Auth Routes
ToDoRouter.post('/register', Register);
ToDoRouter.post('/verify-otp', VerifyOTP);
// `source` field in body (e.g. 'login') controls email wording; login flow uses normal registration-style message
ToDoRouter.post('/resend-otp', ResendOTP);
ToDoRouter.post('/check-status', CheckUserStatus);
ToDoRouter.post('/login', Login);
ToDoRouter.post('/logout', Logout);
ToDoRouter.post('/forgot-password', ForgotPassword);
ToDoRouter.post('/reset-password', ResetPassword);


module.exports=ToDoRouter;

