const mongoose = require('mongoose');

const CredentialSchema = new mongoose.Schema({
    credentialId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Credential', CredentialSchema);
