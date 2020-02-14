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
            
            // Ensures post is in your collector and friends
            const post = await PS.fetchRawEnsuredPost(params);

            // Create comment structure
            params.comment = await new CommentModel({
                poster: params.user._id,
                text: params.text
            });

            // Find and Update comment in comment model
            const newPost = await PS.appendComment(params);

            await PS.addParticipant(params);

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
            const post = await PS.fetchRawPost(params);

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

            await PS.addParticipant(params);

            newPost.comments = await CS.getCommentsWithPopulatedPosters(params);
            return newPost;
        },
        async generateRandomName () {
            const adjectiveList = ["Bald", "Beautiful", "Clean", "Dazzling", "Drab", "Elegant", "Fancy", "Glamorous", "Handsome", "Magnificent", "Quaint", "Quick", "Scruffy", "Shapely", "Red", "Orange", "Yellow", "Green", "Blue", "Purple"];
            const nounList = ["Chicken", "Pug", "Elephant", "Dog", "Penguin", "Alligator", "Monkey", "Ibex", "Shad", "Manatee", "Bird", "Armadillo", "Wolf", "Lion", "Dolphin", "Beetle", "Pelican", "Goose", "Bee", "Badger", "Bison", "Moose"];

            const randomAdj = Math.floor((Math.random() * adjectiveList.length));
            const randomNoun = Math.floor((Math.random() * nounList.length));

            const randomName = adjectiveList[randomAdj] + ' ' + nounList[randomNoun];

            return randomName;
        },
        async getCommentsWithPopulatedPosters (params) {
            const rawPost = await PS.fetchRawPost(params);
            params.rawPost = rawPost;

            const newComments = await Promise.all(rawPost.comments.map(async (comment) => {
                comment.poster = await CS.getDynamicCommentPoster(comment, params);

                // Handle comment replies as well
                if (!isEmpty(comment.replies)) {
                    comment.replies = await Promise.all(comment.replies.map(async (subcomment) => {
                        subcomment.poster = await CS.getDynamicCommentPoster(subcomment, params);
                        return subcomment;
                    }));
                }

                return comment;
            }));
            return newComments;
        },
        async getDynamicCommentPoster(comment, params) {
            const populatedParticipants = await CS.getPopulatedParticpants(params.rawPost, params);
            const commenterIsFriend = await FS.isConfirmedFriend(params.user, comment.poster.toString());
            if (commenterIsFriend) {
                return populatedParticipants[comment.poster.toString()]
            } else {
                const anonNameFromPost = await CS.getAssociatedAnonymousNameFromPost(params.rawPost, comment.poster.toString(), params);
                return anonNameFromPost;
            }
        },
        async getPopulatedParticpants(postObj, params) {
            const participantObj = {}
            const populatedParticipants = await Promise.all(postObj.participantIds.map(participant => {
                return US.getPublicUser(participant);
            }));
            populatedParticipants.map(participant => {
                participantObj[participant._id.toString()] = participant;
            });
            return participantObj;
        },
        async getAssociatedAnonymousNameFromPost(postObj, userId, params) {
            const anonCorrelations = postObj.anonymousCorrelator;
            return anonCorrelations[userId];
        }
    }
}
