const { isEmpty, contains } = require('./helpers');
const CommentModel = require('../models/Comment');
require('mdn-polyfills/Number.isInteger');

module.exports = () => {
    var CS, US, PS, FS;
    return {
        initialize(){
            US = this.parent.US;
            FS = this.parent.FS;
            PS = this.parent.PS;
            CS = this;
        },
        async sendCommentToPost(params) {
            await CS.checkCommentParams(params);
            
            // Also ensures post is in your collector and friends
            const post = await PS.fetchPost(params);

            // Create comment structure
            params.comment = await new CommentModel({
                poster: params.user._id,
                text: params.text
            });

            // Find and Update comment in comment model
            const newPost = await PS.appendComment(params);

            return newPost;
        },
        async checkCommentParams (params) {
            if (isEmpty(params.text)) { return Promise.reject('No content sent.'); }
            return;
        },
        async checkReplyCommentParams (params) {
            if (isEmpty(params.text)) { return Promise.reject('No content sent.'); }
            if (isEmpty(params.replyTo)) { return Promise.reject('No parent comment specified.')}
            if (isEmpty(params.originalPost)) { return Promise.reject('No original post specified.')}
            return;
        },
        async sendCommentToComment(params) {
            await CS.checkCommentParams(params);

            // Also ensures post is in your collector and friends
            const post = await PS.fetchPost(params);

            // Create comment structure
            params.comment = await new CommentModel({
                poster: params.user._id,
                text: params.text
            });

            // Find and Update comment in comment model
            const comments = post.comments;
            comments.forEach(comment => {
                if (comment._id.toString() === params.replyTo.toString()) {
                    comment.replies.push(params.comment);
                }
            });

            params.newComments = comments;
            const newPost = await PS.updateComments(params);

            return newPost;
        } 
    }
}
