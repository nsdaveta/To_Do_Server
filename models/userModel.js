const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    otp: {
        type: String
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Partial TTL Index: Automatically delete UNVERIFIED accounts after 24 hours (86400 seconds)
// Verified accounts will never be deleted because they don't match the filter.
userSchema.index({ createdAt: 1 }, { 
    expireAfterSeconds: 86400, 
    partialFilterExpression: { isVerified: false } 
});

module.exports = mongoose.model('User', userSchema);