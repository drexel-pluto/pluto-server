const PostModel = require('../models/Post');
const UserFeedModel = require('../models/UserFeed');
const { isEmpty, contains } = require('./helpers');

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
            if (isEmpty(params.text)) { return Promise.reject('No content sent'); }
            return
        },
        async createPost(params) {
            await PS.checkPostingParams(params);
            params.user = await US.getUser(params.user.username);
            await PS.ensureAudienceIsFriends(params);

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
            if (audienceSet.has(params.user._id)){
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
            const feedId = params.user.feedCollector;
            const feed = await UserFeedModel
                            .findById(feedId)
                            .populate({
                                path: 'posts.post',
                                select: ['mediaURLs', 'poster', 'text', 'comments', 'likes', 'postedAt'],
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
            return await PostModel.findById(params.postId)
                                .select(['mediaURLs', 'poster', 'text', 'comments', 'likes', 'postedAt']);
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
                select: ['mediaURLs', 'poster', 'text', 'comments', 'likes', 'postedAt']
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
        async getAllSelfPosts(params) {
            const allPosts = await PS.fetchAllPosts(params);
            const selfPosts = allPosts.filter(post => {
                return post.poster == params.user._id
            });
            return selfPosts;
        }
    }
}
