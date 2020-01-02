const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GroupSchema = new Schema({
    title: { type: String },
    members: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    memberIds: [String],
    createdAt: {
        type: Date,
        default: Date.now
    },
    owner: Schema.Types.ObjectId
});

const Group = mongoose.model('Group', GroupSchema);

module.exports = Group;
