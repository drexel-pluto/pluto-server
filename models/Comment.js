const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
    poster: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    postedAt: {
        type: Date,
        default: Date.now
    },
    text: {
        type: String
    },
    replies: [Object],
    mediaURLs: [String],
    likes: {
        type: Number,
        default: 0
    },
    likers: [
        {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
    ],
    replyTo: {
        type: Schema.Types.ObjectId,
        ref: 'Comment'
    }
}, 
{ autoIndex: true });

const Comment = mongoose.model('Comment', CommentSchema);

module.exports = Comment;
