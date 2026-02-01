const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        default: null
    },
    passkey: {
        credentialID: { type: Buffer },
        credentialPublicKey: { type: Buffer },
        counter: { type: Number },
        credentialDeviceType: { type: String },
        credentialBackedUp: { type: Boolean },
        transports: [String]
    },
    passkeyPubkey: {
        type: String,
        default: null
    },
    smartAccountId: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', UserSchema);
