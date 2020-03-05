const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PostSchema = new Schema({
    poster: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    postedAt: {
        type: Date,
        default: Date.now
    },
    durationDaysUntilArchive: {
        type: String
    },
    archiveDate: {
        type: Date
    },
    archiveDateString: {
        type: String
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
    tags: [Object],
    comments: [Object],
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
    participants: [
        {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
    ],
    participantIds: [String],
    anonymousCorrelator: {
        type: Object,
        default: {}
    },
    takenAnonymousNames: [String],
}, 
{ autoIndex: true });

const Post = mongoose.model('Post', PostSchema);

module.exports = Post;
