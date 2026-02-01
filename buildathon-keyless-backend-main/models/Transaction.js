const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    hash: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    ledger: {
        type: Number
    },
    createdAt: {
        type: Date,
        required: true,
        index: true
    },
    tokenSymbol: {
        type: String,
        enum: ['XLM', 'USDC', 'OTHER'],
        required: true,
        index: true
    },
    amount: {
        type: String, // String to preserve precision
        required: true
    },
    memo: {
        type: String,
        default: null
    },
    // Source account (Stellar address)
    from: {
        type: String,
        index: true
    },
    // Destination account (Stellar address)
    to: {
        type: String,
        index: true
    },
    // Direction relative to user's smart account
    direction: {
        type: String,
        enum: ['in', 'out']
    },
    // Store original asset info for non-standard assets
    rawAsset: {
        type: String,
        default: null
    },
    // Pagination cursor from Horizon
    pagingToken: {
        type: String,
        index: true
    }
});

// Compound index for efficient address queries by date
TransactionSchema.index({ from: 1, createdAt: -1 });
TransactionSchema.index({ to: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', TransactionSchema);