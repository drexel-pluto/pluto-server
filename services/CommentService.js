const { isEmpty, contains } = require('./helpers');
const CommentModel = require('../models/Comment');
require('mdn-polyfills/Number.isInteger');

module.exports = () => {
    var CS, US, PS, FS, NS;
    return {
        initialize(){
            US = this.parent.US;
            FS = this.parent.FS;
            PS = this.parent.PS;
            NS = this.parent.NS;
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

            // Let poster know somebody commented
            const notificationObj = {
                notificationFor: post.poster,
                notificationFrom: params.user._id,
                notificationText: `${params.user.name} commented on your post`,
                showUser: true
            }
            await NS.sendNotification(notificationObj);

            const preparedPost = await PS.getPostForDelivery(newPost, params);
            return preparedPost;
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
            let replyingToThisComment;
            const comments = post.comments;
            comments.forEach(comment => {
                if (comment._id.toString() === params.replyTo.toString()) {
                    comment.replies.push(params.comment);
                    replyingToThisComment = comment;
                }
            });

            params.newComments = comments;
            const newPost = await PS.updateComments(params);

            await PS.addParticipant(params);

            // Let poster know somebody commented
            await CS.handleCommentReplyNotification(post, replyingToThisComment, params.comment, params);

            const preparedPost = await PS.getPostForDelivery(newPost, params);
            return preparedPost;
        },
        async generateRandomName () {
            const adjectiveList = ["Bald", "Beautiful", "Clean", "Dazzling", "Drab", "Elegant", "Fancy", "Glamorous", "Handsome", "Magnificent", "Quaint", "Quick", "Scruffy", "Shapely", "Red", "Orange", "Yellow", "Green", "Blue", "Purple"];
            const nounList = ["Chicken", "Pug", "Elephant", "Dog", "Penguin", "Alligator", "Monkey", "Ibex", "Shad", "Manatee", "Bird", "Armadillo", "Wolf", "Lion", "Dolphin", "Beetle", "Pelican", "Goose", "Bee", "Badger", "Bison", "Moose"];

            const randomAdj = Math.floor((Math.random() * adjectiveList.length));
            const randomNoun = Math.floor((Math.random() * nounList.length));

            const randomName = adjectiveList[randomAdj] + ' ' + nounList[randomNoun];

            return randomName;
        },
        async getDynamicCommentPoster(post, comment, params) {
            const populatedParticipants = params.participants;
            const commenterIsFriend = await FS.isConfirmedFriend(params.user, comment.poster.toString());
            if (commenterIsFriend) {
                return populatedParticipants[comment.poster.toString()]
            } else {
                const anonNameFromPost = await CS.getAssociatedAnonymousNameFromPost(post, comment.poster.toString(), params);
                return anonNameFromPost;
            }
        },
        async getPopulatedParticpants(rawPostObj, params) {
            const participantObj = {}
            const populatedParticipants = await Promise.all(rawPostObj.participantIds.map(async participant => {
                return await US.getPublicUser(participant);
            }));
            populatedParticipants.map(participant => {
                participantObj[participant._id.toString()] = participant;
            });
            return participantObj;
        },
        async getAssociatedAnonymousNameFromPost(postObj, userId, params) {
            const anonCorrelations = postObj.anonymousCorrelator;
            return anonCorrelations[userId];
        },
        async prepareSinglePostCommentSection(post, params) {
            params.participants = await CS.getPopulatedParticpants(post, params);
            const newComments = await Promise.all(post.comments.map(async (comment) => {
                comment.poster = await CS.getDynamicCommentPoster(post, comment, params);

                // Handle comment replies as well
                if (!isEmpty(comment.replies)) {
                    comment.replies = await Promise.all(comment.replies.map(async (subcomment) => {
                        subcomment.poster = await CS.getDynamicCommentPoster(post, subcomment, params);
                        return subcomment;
                    }));
                }

                return comment;
            }));
            return newComments;
        },
        async handleCommentReplyNotification (post, originalComment, newComment, params) {
            if (params.user._id.toString() === originalComment.poster._id.toString()) { return }
            const populatedParticipants = await CS.getPopulatedParticpants(post, params);
            params.participants = populatedParticipants;

            const name = await CS.getDynamicCommentPoster(post, originalComment, params);
            const isFriends = (name.name) ? true : false;
            const visibleName = (isFriends) ? name.name : name;
            const notificationObj = {
                notificationFor: originalComment.poster,
                notificationFrom: params.user._id,
                showUser: isFriends,
                notificationText: `${visibleName} replied to your comment`
            }
            await NS.sendNotification(notificationObj);
            return;
        },
        async fetchComment({ postId, commentId }) {
            const params = { postId }
            const post = await PS.fetchRawPost(params);
            const comments = post.comments;
            const comment = comments.filter(comment => comment._id == commentId);
            if (isEmpty(comment)) { return Promise.reject('Could not fetch comment.') }
            return comment[0];
        },
        async fetchCommentFromComments({ commentsObj, commentId }) {
            const comment = commentsObj.filter(comment => comment._id == commentId);
            if (isEmpty(comment)) { return Promise.reject('Could not fetch comment.') }
            return comment[0];
        },
        async fetchRawComments({ postId }) {
            const params = { postId }
            const post = await PS.fetchRawPost(params);
            return post.comments;
        },
        async ensureCommentOwner({ commentObj, user }) {
            if (commentObj.poster.toString() !== user._id.toString()) { return Promise.reject('Only comment owners can delete their comments.') }
            return;
        },
        async deleteCommentOnPost(params) {
            const comments = await CS.fetchRawComments({ postId: params.postId, commentId: params.commentId });
            const comment = await CS.fetchCommentFromComments({ commentsObj: comments, commentId: params.commentId });
            await CS.ensureCommentOwner({ commentObj: comment, user: params.user });
            const newComments = comments.filter(comment => comment._id.toString() !== params.commentId.toString());
            params.newComments = newComments;
            const post = await PS.updateComments(params);
            return post;
        }
    }
}
