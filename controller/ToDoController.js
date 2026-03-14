const todos = require('../models/todomodel.js');
const User = require('../models/userModel.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Debugging env vars (DO NOT LOG ACTUAL PASSWORD)
console.log("Checking Email Configuration...");
if (!process.env.EMAIL_USER) console.error("❌ EMAIL_USER is missing!");
if (!process.env.EMAIL_PASS) console.error("❌ EMAIL_PASS is missing!");

// Configure Nodemailer with service: 'gmail' and explicit timeouts
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: (process.env.EMAIL_USER || "").trim(),
        pass: (process.env.EMAIL_PASS || "").trim()
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 10000, // 10 seconds timeout
    greetingTimeout: 10000,
    logger: true,
    debug: true
});

// Verify connection configuration immediately
console.log("🚀 Starting Nodemailer verification...");
transporter.verify()
    .then(() => console.log("✅ Nodemailer: Server is ready to take our messages"))
    .catch((err) => {
        console.error("❌ Nodemailer verification failed:");
        console.error("Code:", err.code);
        console.error("Message:", err.message);
    });

const Register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error("Email credentials missing in .env file");
            return res.status(500).json({ message: "Server configuration error: Email credentials missing." });
        }

        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields (username, email, password) are required." });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        let user;
        const existingUser = await User.findOne({ email: normalizedEmail });
        
        if (existingUser) {
            if (existingUser.isVerified) {
                return res.status(400).json({ message: "User already exists and is verified. Please log in." });
            }
            // If unverified, update the existing record with new details and a new OTP
            existingUser.username = username;
            existingUser.password = hashedPassword;
            existingUser.otp = otp;
            user = await existingUser.save();
        } else {
            user = new User({
                username,
                email: normalizedEmail,
                password: hashedPassword,
                otp,
                isVerified: false
            });
            await user.save();
        }

        console.log(`[DEV ONLY] OTP for ${normalizedEmail}: ${otp}`);

        console.log(`Attempting to send OTP email to: ${normalizedEmail}`);
        const mailOptions = {
            from: `"To-Do List App" <${process.env.EMAIL_USER}>`,
            to: normalizedEmail,
            subject: 'Verify your email',
            text: `Your OTP for verification is: ${otp}`
        };

        // Await the email sending process to ensure it completes
        try {
            await transporter.sendMail(mailOptions);
            console.log(`✅ Verification email sent to ${normalizedEmail}`);
            return res.status(201).json({ message: "Registration successful. Please check your email for the OTP." });
        } catch (mailError) {
            console.error("❌ Email sending error details:", mailError);
            return res.status(500).json({ 
                message: "User created but failed to send verification email. " + 
                         (process.env.NODE_ENV === 'production' 
                            ? "Please try resending OTP later." 
                            : "Check your server terminal for the OTP if testing locally."),
                email: normalizedEmail,
                error: mailError.message
            });
        }
    } catch (error) {
        console.error("Error during registration:", error.message);
        // Handle MongoDB duplicate key error (e.g. username already taken)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || 'field';
            return res.status(400).json({ message: `That ${field} is already taken. Please choose a different one.` });
        }
        res.status(500).json({ message: error.message || "An internal server error occurred during registration." });
    }
};

const VerifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        if (user.otp !== String(otp).trim()) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        user.isVerified = true;
        user.otp = undefined;
        await user.save();

        res.json({ message: "Email verified successfully." });
    } catch (error) {
        res.status(500).json({ message: error.message || "An internal server error occurred." });
    }
};

const ResendOTP = async (req, res) => {
    try {
        const { email, source } = req.body; // `source` can be 'login' when triggered from login verify button
        
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: "User is already verified" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        await user.save();

        console.log(`[DEV ONLY] ${source === 'login' ? 'Sent' : 'Resent'} OTP for ${normalizedEmail}: ${otp}`);

        // choose wording based on where the request came from
        const mailOptions = {
            from: `"To-Do List App" <${process.env.EMAIL_USER}>`,
            to: normalizedEmail,
            subject: source === 'login' ? 'Verify your email' : 'Resent OTP - Verify your email',
            text: source === 'login'
                ? `Your OTP for verification is: ${otp}`
                : `Your new OTP for verification is: ${otp}`
        };

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error("Email credentials missing in .env file");
            return res.status(500).json({ message: "Server configuration error: Email credentials missing." });
        }

        // Await the email sending process to ensure it completes
        try {
            await transporter.sendMail(mailOptions);
            console.log(`✅ OTP ${source === 'login' ? 'sent' : 'resent'} to ${normalizedEmail}`);
            res.json({ message: "OTP sent successfully. Please check your email (or your server console if testing locally)." });
        } catch (mailError) {
            console.error("❌ Error sending email:", mailError);
            throw mailError; // Let the outer catch handle and format the error response
        }
    } catch (error) {
        console.error("Error resending OTP:", error);
        let errorMessage = "Failed to resend OTP. Please try again later."
        if (error.code === 'EAUTH') {
            errorMessage = "Authentication failed. Please check your email credentials in the .env file.";
        } else if (error.code === 'ECONNECTION') {
            errorMessage = "Connection error. Could not connect to the email server.";
        } else if (error.responseCode === 550) {
            errorMessage = "Recipient email address not found or rejected.";
        }
        res.status(500).json({ message: errorMessage });
    }
};

const CheckUserStatus = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
             return res.status(400).json({ message: "Email is required" });
        }
        
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ isVerified: user.isVerified });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const Login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        if (!user.isVerified) {
            return res.status(400).json({ message: "Please verify your email first" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
        res.json({ token, user: { id: user._id, email: user.email, username: user.username } });
    } catch (error) {
        res.status(500).json({ message: error.message || "An internal server error occurred." });
    }
};

const Logout = async (req, res) => {
    try {
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

const ToDo=async(req,res)=>
{
    try {
        const todoList= await todos.find({ user_id: req.user });
        res.send(todoList);
    } catch (error) {
        res.status(500).send(error.message);
    }
}
const Add_ToDo=async(req,res)=>
{
    try {
        const {title}=req.body
        const Added_ToDo=await todos.create({title, user_id: req.user})
        res.send(Added_ToDo);
    } catch (error) {
        res.status(500).send(error.message);
    }

}
const Update_ToDo=async(req,res)=>
{
    try {
        const data=req.body;
        const id=req.params.id;
        const Updated_ToDo=await todos.findOneAndUpdate({ _id: id, user_id: req.user },data,{new:true})
        res.send(Updated_ToDo);
    } catch (error) {
        res.status(500).send(error.message);
    }
}


const Delete_ToDo=async (req,res)=> 
{
    try {
        const id=req.params.id;
        const Deleted_ToDo=await todos.findOneAndDelete({ _id: id, user_id: req.user });
        res.send(Deleted_ToDo)
    } catch (error) {
        res.status(500).send(error.message);
    } 
}

const ForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        await user.save();

        console.log(`[DEV ONLY] Forgot Password OTP for ${normalizedEmail}: ${otp}`);

        const mailOptions = {
            from: `"To-Do List App" <${process.env.EMAIL_USER}>`,
            to: normalizedEmail,
            subject: 'Password Reset OTP',
            text: `Your OTP for password reset is: ${otp}`
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`✅ Password reset OTP sent to ${normalizedEmail}`);
            return res.json({ message: "Password reset OTP sent to your email." });
        } catch (mailError) {
            console.error("❌ Error sending forgot password email:", mailError);
            return res.status(500).json({ 
                message: "Failed to send password reset email. " + 
                         (process.env.NODE_ENV === 'production' 
                            ? "Please try again later." 
                            : "Check your server console if testing locally.")
            });
        }
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ message: error.message || "An internal server error occurred." });
    }
};

const ResetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.otp !== String(otp).trim()) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({ message: "New password cannot be the same as the old password." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        user.otp = undefined;
        await user.save();

        res.json({ message: "Password reset successful. You can now login." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



module.exports={ToDo,Add_ToDo,Update_ToDo,Delete_ToDo, Register, VerifyOTP, ResendOTP, Login, Logout, ForgotPassword, ResetPassword, CheckUserStatus}
