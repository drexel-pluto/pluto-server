const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PostSchema = new Schema({
    poster: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    durationDaysUntilArchive: {
        type: String
    },
    archiveDate: {
        type: Date
    },
    text: {
        type: String
    },
    allowedAudienceIds: [String],
    allowedAudience: [
        {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    mediaURLs: [String],
    tag: String,
}, 
{ autoIndex: true });

const Post = mongoose.model('Post', PostSchema);

module.exports = Post;
