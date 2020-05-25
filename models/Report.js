const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PostSchema = new Schema({
    reporter: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    post: {
        type: Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    postedAt: {
        type: Date,
        default: Date.now
    },
}, 
{ autoIndex: true });

const Post = mongoose.model('Report', PostSchema);

module.exports = Post;
