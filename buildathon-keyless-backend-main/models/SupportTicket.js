const mongoose = require('mongoose');

const SupportTicketSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    walletAddress: {
        type: String,
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['feedback', 'query'],
        required: true
    },
    status: {
        type: String,
        enum: ['open', 'closed'],
        default: 'open'
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Compound index for efficient wallet queries by date
SupportTicketSchema.index({ walletAddress: 1, createdAt: -1 });

module.exports = mongoose.model('SupportTicket', SupportTicketSchema);