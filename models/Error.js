const mongoose = require('mongoose');
const Schema = mongoose.Schema;
 
const xErrorSchema = new Schema({
    errCode: {
        type: Number,
        required: true
    },
    errMessage: {
        type: String,
        required: false
    },
    defcon: {
        default: 5,
        type: Number,
        min: 1,
        max: 5
    },
    isBlocker: {
        default: false,
        type: Boolean
    },
    isDBErr: {
        default: false,
        type: Boolean
    },
    isClientErr: {
        default: false,
        type: Boolean
    },
    whichController: {
        type: String
    },
    whichRoute: {
        type: String
    },
    whichModel: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    successfulSave: {
        default: true,
        type: Boolean
    }
});

const xError = mongoose.model('xerror', xErrorSchema);

module.exports = xError;
