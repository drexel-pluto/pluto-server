const PostModel = require('../models/Post');
const ReportModel = require('../models/Report');
const UserFeedModel = require('../models/UserFeed');
const { isEmpty, contains } = require('./helpers');
require('mdn-polyfills/Number.isInteger');

const PUBLIC_POST_SELECTION = ['mediaURLs', 'poster', 'text', 'comments', 'likes', 'postedAt', '_id', 'tags', 'isLiked'];

module.exports = () => {
    var US, PS, FS, GS, IS, CS;
    return {
        initialize(){
            US = this.parent.US;
            FS = this.parent.FS;
            GS = this.parent.GS;
            IS = this.parent.IS;
            CS = this.parent.CS;
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
                tags: params.tags,
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
            const freshUser = await US.getUserById(params.user._id);
            return await Promise.all(params.audienceIds.map(async (id) => {
                await FS.ensureFriends(freshUser, id);
            }));
        },
        async addPostToCollectors(params) {
            return await Promise.all(params.audienceIds.map(async (id) => {
                const tags = await PS.getRawTags(params);
                const friendsFeedCollector = await US.getFeedCollectorId(id);
                const postObj = {
                    poster: params.user._id,
                    post: params.postId,
                    tags: tags
                }
                const filter = { _id: friendsFeedCollector }
                const update = { $push: {
                        "posts" : {
                            $each: [ postObj ],
                            $position: 0
                        },
                        "postIds": {
                            $each: [ params.postId ],
                            $position: 0
                        }
                    }
                }
                return UserFeedModel.findOneAndUpdate(filter, update, { new: true });
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
                return UserFeedModel.findOneAndUpdate(filter, update, { new: true });
            }));
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
            const freshUser = await US.getUserById(params.user._id);
            params.user = freshUser;
            const post = await PostModel.findById(params.postId);
            await FS.ensureFriends(freshUser, post.poster._id);
            const preparedPost = await PS.getPostForDelivery(post, params);
            return preparedPost;
        },
        async fetchRawPost(params) {
            const post = await PostModel.findById(params.postId);
            return post;
        },
        async fetchRawEnsuredPost(params) {
            await PS.ensurePostIsInCollector(params);
            const freshUser = await US.getUserById(params.user._id);
            const post = await PostModel.findById(params.postId);
            await FS.ensureFriends(freshUser, post.poster);
            return post;
        },
        async ensurePostIsForUser(params) {
            await PS.ensurePostIsInCollector(params);
            const freshUser = await US.getUserById(params.user._id);
            const post = await PostModel.findById(params.postId).lean();
            await FS.ensureFriends(freshUser, post.poster);
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
        async filterCollectedPostsByPoster(posterId, allPosts) {
            return allPosts.filter(post => {
                return post.poster == posterId
            });
        },
        async getAllSelfPosts(params) {
            const likerPopulation = {
                path: 'likers',
                model: 'User',
                select: ['username', 'name', 'profilePicURL']
            }

            params.optionalSelection = ['likers'];
            params.username = params.user.username;
            const selfPosts = await PS.fetchUsersPosts(params);
            const postsWithPopulatedLikers = await PostModel.populate(selfPosts, likerPopulation);
            return postsWithPopulatedLikers;
        },
        async increaseReactionCount(params) {
            await PS.checkReactionParams(params);
            await PS.ensurePostIsForUser(params);

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
            return await PostModel.findOneAndUpdate(filter, update, { new: true });
        },
        async updateComments(params) {
            // Expects params.postId | params.newComments
            const filter = { _id: params.postId }
            const update = { comments: params.newComments }
            return await PostModel.findOneAndUpdate(filter, update, { new: true });
        },
        async addParticipant(params) {
            const post = await PS.fetchRawPost(params);
            params.freshPost = post;

            // Dont want to add duplicates
            const isPostParticipant = await PS.isPostParticipant(params.user, post);
            if (isPostParticipant) { return }

            // ------ Only first time post participants beyond this point ------ 

            // Create anonymous identity for person
            const anonName = await PS.getAnonymousName(params);

            const postsAnonCorrelator = post.anonymousCorrelator;
            postsAnonCorrelator[params.user._id.toString()] = anonName;

            const filter = { _id: params.postId }
            const update = {
                $addToSet : {
                    participants: params.user._id,
                    participantIds: params.user._id.toString(),
                    takenAnonymousNames: anonName
                },
                anonymousCorrelator: postsAnonCorrelator
            }
            const selection = PUBLIC_POST_SELECTION;
            return await PostModel.findOneAndUpdate(filter, update, { new: true }).select(selection);
        },
        async isPostParticipant (userObj, postObj) {
            const participants = postObj.participantIds;
            const participantSet = new Set(participants);
            return participantSet.has(userObj._id.toString());
        },
        async getAnonymousName(params) {
            // Needs params.freshPost object passed in
            const post = params.freshPost;
            const generatedAnonymousName = await CS.generateRandomName();

            const takenNames = post.takenAnonymousNames;
            const takenNameSet = new Set(takenNames);
            const isTaken = takenNameSet.has(generatedAnonymousName.toString());

            if (isTaken) {
                return await PS.getAnonymousName(params);
            } else {
                return generatedAnonymousName;
            }
        },
        async getFilteredPostData(rawPost, params) {
            Object.keys(rawPost).forEach(key => {
                if (!contains.call(PUBLIC_POST_SELECTION, key.toString())) {
                    delete rawPost[key];
                }
            });
            return rawPost;
        },
        async populateCommentPostersForManyPosts(manyPosts, params) {
            const postsWithComments = await Promise.all(manyPosts.map(async post => {
                post.comments = await CS.prepareSinglePostCommentSection(post, params);
                return post;
            }));
            return postsWithComments;
        },
        async fetchPosts(filterFunction, params) {
            // Get empty posts from feed collector
            const posts = await PS.getAllEmptyPosts(params);

            // Filter any posts hidden by user
            const hiddenPosts = (await US.getUser(params.user.username)).hiddenPosts;
            const nonHiddenPosts = hiddenPosts ? posts.filter(post => 
                !hiddenPosts.some(hiddenId => 
                    hiddenId.toString() == post.post
                ) 
            ) : posts;

            // Filter by meta info before population
            const filteredPosts = (filterFunction)
                ? await filterFunction(...params.filterVars, nonHiddenPosts)
                : nonHiddenPosts;

            // Hydrate with populated data
            const hydratedPosts = await PS.hydrateEmptyPosts(filteredPosts, params);
            const postsWithIsLikedProperty = await PS.addIsLikedProperty(hydratedPosts, params);
            const postsWithComments = await PS.preparePostsCommentSection(postsWithIsLikedProperty, params);

            // Sanitize out sensitive / non-display information
            const sanitizedPosts = await PS.sanitizePostsInfo(postsWithComments, params);
            return sanitizedPosts;
        },
        async getAllEmptyPosts(params) {
            const feedId = params.user.feedCollector;
            const feed = await UserFeedModel.findById(feedId);
            return feed.posts;
        },
        async hydrateEmptyPosts(emptyPosts, params) {
            const opts = {
                path: 'post',
                populate: {
                    path: 'poster',
                    select: ['username', 'name', 'email', 'profilePicURL']
                }
            }
            let posts = await PostModel.populate(emptyPosts, opts);

            // Remove post collector meta info
            posts = posts.map(post => post.post);

            return posts;
        },
        async preparePostsCommentSection(manyPosts, params) {
            const postsWithComments = await Promise.all(manyPosts.map(async post => {
                post.comments = await CS.prepareSinglePostCommentSection(post, params);
                return post;
            }));
            return postsWithComments;
        },
        async sanitizePostsInfo(posts, params) {
            const defaultSelection = PUBLIC_POST_SELECTION;
            const selection = (params.optionalSelection)
                ? defaultSelection.concat(params.optionalSelection)
                : defaultSelection;
            return posts.map(post => {
                const newPostObj = {}
                selection.forEach(key => {
                    newPostObj[key] = post[key];
                });

                return newPostObj;
            });
        },
        async sanitizePostInfo(post, params) {
            const defaultSelection = PUBLIC_POST_SELECTION;
            const selection = (params.optionalSelection)
                ? defaultSelection.concat(params.optionalSelection)
                : defaultSelection;

            const newPostObj = {}
            selection.forEach(key => {
                newPostObj[key] = post[key];
            });

            return newPostObj;
        },
        // Will take either a username param or userId param
        async fetchUsersPosts(params) {
            const freshUser = await US.getUserById(params.user._id);
            const friendId = (params.userId) ? params.userId : await US.getUsersId(params);
            await FS.ensureFriends(freshUser, friendId);

            // Filter variables must be supplied in the params
            params.filterVars = [friendId];
            const filterFunction = async function(userId, posts) {
                return posts.filter(post => post.poster.toString() === userId.toString());
            };

            const posts = await PS.fetchPosts(filterFunction, params);
            return posts;
        },
        async fetchAllPosts(params) {
            const posts = await PS.fetchPosts(null, params);
            return posts;
        },
        async fetchPostsByGroup(params) {
            const group = await GS.getRawGroup(params);
            const groupMemberIds = group.members.map(member => member.toString());

            // Filter variables must be supplied in the params
            params.filterVars = [groupMemberIds];
            const filterFunction = async function(groupMemberIds, posts) {
                return posts.filter(post => contains.call(groupMemberIds, post.poster.toString()))
            };

            const posts = await PS.fetchPosts(filterFunction, params);
            return posts;
        },
        async getPostForDelivery(post, params) {
            post.comments = await CS.prepareSinglePostCommentSection(post, params);
            const sanitizedPost = await PS.sanitizePostInfo(post, params);
            const poster = await US.getPosterById(post.poster);
            sanitizedPost.poster = poster;
            return sanitizedPost;
        },
        async getRawTags(params) {
            const tagObjs = params.tags;
            const rawTags = tagObjs.map(tag => tag.name);
            return rawTags;
        },
        async addIsLikedProperty(posts, params) {
            return posts.map(post => {
                const likerStrings = post.likers.map(likers => likers._id.toString());
                const likersSet = new Set(likerStrings);
                const isLiked = likersSet.has(params.user._id.toString());
                post.isLiked = isLiked;
                return post;
            });
        },
        async getPostsByTag(params) {
            // Filter variables must be supplied in the params
            params.filterVars = [params.tag];
            const filterFunction = async function(tag, posts) {
                return posts.filter(post => contains.call(post.tags, tag));
            };

            const posts = await PS.fetchPosts(filterFunction, params);
            return posts;
        },
        async removeAllPostsFromUser(friendId, params) {
            const posts = await PS.getAllEmptyPosts(params);
            const newPosts = await Promise.all(posts.map(async post => {
                if (post.poster.toString() !== friendId.toString()) {
                    return post;
                }
            }));
            return newPosts;

        },
        async reportPost(params) {
            const report = await ReportModel.create({
                reporter: params.user._id,
                post: params.postId
            });
            return report;
        }
    }
}
