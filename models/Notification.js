const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
    createdAt: {
        type: Date,
        default: Date.now
    },
    text: String,
    from: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    showUser: {
        type: Boolean,
        default: false
    },
    postId: {
        type: Schema.Types.ObjectId,
        ref: 'Post',
        default: null
    },
    type: {
        type: String,
        enum: [
            "recieveFriendReq",
            "confirmFriendReq",
            "comment"
        ],
        required: true,
        default: "friendReq"

    }
});

const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification;
