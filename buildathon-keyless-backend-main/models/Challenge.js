const mongoose = require('mongoose');

const ChallengeSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    challenge: {
        type: String,
        required: true
    },
    tempUserId: {
        type: String
    },
    userName: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 120 // Auto-delete after 120 seconds (TTL index)
    }
});

module.exports = mongoose.model('Challenge', ChallengeSchema);
