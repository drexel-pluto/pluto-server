const PostModel = require('../models/Post');
const UserFeedModel = require('../models/UserFeed');
const { isEmpty, contains } = require('./helpers');
require('mdn-polyfills/Number.isInteger');

const PUBLIC_POST_SELECTION = ['mediaURLs', 'poster', 'text', 'comments', 'likes', 'postedAt'];

module.exports = () => {
    var US, PS, FS, GS, IS;
    return {
        initialize(){
            US = this.parent.US;
            FS = this.parent.FS;
            GS = this.parent.GS;
            IS = this.parent.IS;
            PS = this;
        },
        async checkPostingParams(params){
            if (isEmpty(params.text) && (isEmpty(params.files))) { return Promise.reject('No content sent'); }
            if (isEmpty(params.audienceIds)) { return Promise.reject('No audience specified.'); }
            if (isEmpty(params.durationDaysUntilArchive)) { return Promise.reject('No decay duration specified.'); }
            if ((params.audienceIds.length < 2) && (params.audienceIds[0] == params.user._id)) { return Promise.reject('No audience besides yourself specified.'); }
            return
        },
        async createPost(params) {
            await PS.checkPostingParams(params);
            params.user = await US.getUser(params.user.username);
            await PS.ensureAudienceIsFriends(params);
            await PS.ensurePositiveInteger(params.durationDaysUntilArchive);

            const mediaURLs = await IS.uploadMedia(params.files);
            const archiveDay = await PS.getArchiveDay(params);
            const newAudience = await PS.addPosterToAudience(params);
            const post = await PostModel.create({
                poster: params.user._id,
                durationDaysUntilArchive: params.durationDaysUntilArchive,
                archiveDate: archiveDay,
                archiveDateString: archiveDay,
                text: params.text,
                tag: params.tag,
                allowedAudience: newAudience,
                allowedAudienceIds: newAudience,
                comments: [],
                likes: 0,
                mediaURLs
            });
            params.postId = post._id;

            await PS.addPostToCollectors(params);
            return post;
        },
        async addPosterToAudience(params) {
            const audienceSet = new Set(params.audienceIds);
            if (audienceSet.has(params.user._id.toString())){
                return params.audienceIds;
            } else {
                params.audienceIds.push(params.user._id);
                return params.audienceIds;
            }
        },
        async getArchiveDay(params) {
            var date = new Date();
            date.setDate(date.getDate() + params.durationDaysUntilArchive);
            return date.toISOString().substring(0, 10);
        },
        async ensureAudienceIsFriends(params) {
            return await Promise.all(params.audienceIds.map(async (id) => {
                await FS.ensureFriends(params.user, id);
            }));
        },
        async addPostToCollectors(params) {
            return await Promise.all(params.audienceIds.map(async (id) => {
                const friendsFeedCollector = await US.getFeedCollectorId(id);
                const postObj = {
                    poster: params.user._id,
                    post: params.postId
                }
                const filter = { _id: friendsFeedCollector }
                const update = { $push: { posts : postObj, postIds: params.postId }}
                return await UserFeedModel.findOneAndUpdate(filter, update, { new: true });
            }));
        },
        async removePostFromCollectors(params) {
            return await Promise.all(params.audienceIds.map(async (id) => {
                const friendsFeedCollector = await US.getFeedCollectorId(id);
                const filter = { _id: friendsFeedCollector }
                const update = { $pull: {
                        posts : { post: params.postId },
                        postIds: params.postId
                }}
                return await UserFeedModel.findOneAndUpdate(filter, update, { new: true });
            }));
        },
        async fetchAllPosts(params) {
            // Sample params object
            // Add an optionalSelection array to add custom select properties
            // const params = {
            //      user: req.user,
            //      optionalSelection: ['likers']
            // }
            //
            const feedId = params.user.feedCollector;
            const defaultSelection = PUBLIC_POST_SELECTION;
            const selection = (params.optionalSelection)
                ? defaultSelection.concat(params.optionalSelection)
                : defaultSelection;
            const feed = await UserFeedModel
                            .findById(feedId)
                            .populate({
                                path: 'posts.post',
                                select: selection,
                                populate: {
                                    path: 'poster',
                                    select: ['username', 'name', 'email', 'profilePicURL']
                                }
                            });
            return feed.posts;
        },
        async deletePost(params) {
            const post = await PostModel.findById(params.postId);
            await PS.ensurePostOwner(post, params.user, params);
            params.audienceIds = post.allowedAudience;
            await PS.removePostFromCollectors(params);
            return await PostModel.findByIdAndDelete(params.postId);
        },
        async fetchPost(params) {
            await PS.ensurePostIsInCollector(params);
            const post = await PostModel.findById(params.postId)
                                .select(PUBLIC_POST_SELECTION);
            await FS.ensureFriends(params.user, post.poster);
            return post;
        },
        async ensurePostOwner(postObj, userObj, _params) {
            if (postObj.poster != userObj._id) {
                return Promise.reject('You are not the author of this post.');
            }
            return;
        },
        async ensurePostIsInCollector(params) {
            const collectorId = params.user.feedCollector;
            const postCollector = await UserFeedModel.findById(collectorId);
            const postSet = new Set(postCollector.postIds);
            if (!postSet.has(params.postId)) {
                return Promise.reject('You are not eligible to view this post.')
            }
            return;
        },
        async fetchPostsByGroup(params) {
            const collectorId = params.user.feedCollector;
            const group = await GS.getRawGroup(params);
            const groupMemberIds = group.members.map(member => member.toString());
            const filter =  { _id: collectorId }
            const postPopulation = {
                path: 'post',
                model: 'Post',
                select: PUBLIC_POST_SELECTION
            }
            const posterPopulation = {
                path: 'poster',
                model: 'User',
                select: ['username', 'name', 'profilePicURL']
            }
            // Not the best. Can be replaced by an aggregate thing for cleaner
            const posts = await UserFeedModel
                            .findOne(filter)
                            .then(postObj => {
                                return postObj.posts.filter(post => {
                                    return contains.call(groupMemberIds, post.poster.toString())
                                })
                            })
                            .then(rawPostArr => {
                                return UserFeedModel.populate(rawPostArr, postPopulation)
                                    .then(populatedArr => { return populatedArr });
                            })
                            .then(populatedArr => {
                                return UserFeedModel.populate(populatedArr, posterPopulation)
                                    .then(populatedArr => { return populatedArr });
                            })
            return posts;
        },
        async filterCollectedPostsByPoster(posterId, allPosts) {
            return allPosts.filter(post => {
                return post.poster == posterId
            });
        },
        async getAllSelfPosts(params) {
            const likerPopulation = {
                path: 'post.likers',
                model: 'User',
                select: ['username', 'name', 'profilePicURL']
            }

            // Adding optional selection for fetchAllPosts
            params.optionalSelection = ['likers'];
            const allPosts = await PS.fetchAllPosts(params);


            const selfPosts = await PS.filterCollectedPostsByPoster(params.user._id, allPosts);
            const postsWithPopulatedLikers = await PostModel.populate(selfPosts, likerPopulation);
            return postsWithPopulatedLikers;
        },
        // Will take either a username param or userId param
        async fetchUsersPosts(params) {
            const friendId = (params.userId) ? params.userId : await US.getUsersId(params);
            await FS.ensureFriends(params.user, friendId);
            const allPosts = await PS.fetchAllPosts(params);
            const usersPosts = await PS.filterCollectedPostsByPoster(friendId, allPosts);
            return usersPosts;
        },
        async increaseReactionCount(params) {
            await PS.checkReactionParams(params);

            // We want to ensure users are friends and post is in collector before being able to like
            // Fetch post does both of those things
            // Can call individually, but need poster id before ensuring friends, hence the fetchPost() anyways
            await PS.fetchPost(params);

            const newPost = await PS.addToReactionCount(params);
            return newPost;
        },
        async addToReactionCount(params) {
            const filter = { _id: params.postId }
            const update = {
                $inc : { likes: params.amount },
                $addToSet: { likers: params.user._id }
            }
            const selection = PUBLIC_POST_SELECTION;
            return await PostModel.findOneAndUpdate(filter, update, { new: true }).select(selection);
        },
        async checkReactionParams(params) {
            return await PS.ensurePositiveInteger(params.amount);
        },
        async ensurePositiveInteger(num) {
            if (num < 0) { return Promise.reject('Supplied number must be a positive integer.'); }
            if (!num) { return Promise.reject('No number supplied. Number must be a positive integer.'); }
            if (!Number.isInteger(num)) { return Promise.reject('Supplied number must be a positive integer.'); }
            return;
        },
        async appendComment(params) {
            // Expects params.comment | params.postId
            const filter = { _id: params.postId }
            const update = {
                $push : { comments: params.comment }
            }
            const selection = PUBLIC_POST_SELECTION;
            return await PostModel.findOneAndUpdate(filter, update, { new: true }).select(selection);
        },
        async updateComments(params) {
            // Expects params.postId | params.newComments
            const filter = { _id: params.postId }
            const update = { comments: params.newComments }
            const selection = PUBLIC_POST_SELECTION;
            return await PostModel.findOneAndUpdate(filter, update, { new: true }).select(selection);

        }
    }
}
