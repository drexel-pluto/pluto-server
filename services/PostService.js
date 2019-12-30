const PostModel = require('../models/Post');
const UserFeedModel = require('../models/UserFeed');
const FS = require('./FriendService');
const US = require('./UserService');
const { isEmpty } = require('./helpers');

const PS = {
    async checkPostingParams(params){
        if (isEmpty(params.text)) { return Promise.reject('No content sent'); }
        return
    },
    async createPost(params) {
        console.log(US);
        return await US.getUser('mike');
        // await PS.checkPostingParams(params)
        // params.user = await US.getUser(params.user.username);
        // await PS.ensureAudienceIsFriends(params);


        // const archiveDay = await PS.getArchiveDay(params);
        // const post = await PostModel.create({
        //     poster: params.user._id,
        //     durationDaysUntilArchive: params.durationDaysUntilArchive,
        //     archiveDate: archiveDay,
        //     archiveDateString: archiveDay,
        //     text: params.text,
        //     tag: params.tag,
        //     allowedAudience: params.audienceIds,
        //     allowedAudienceIds: params.audienceIds,
        //     comments: [],
        //     likes: 0
        // });
        // params.postId = post._id;

        // await addPostToCollectors(params);
        // return post;
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
            const filter = { _id: friendsFeedCollector }
            const update = { $push: { posts : params.postId }}
            return await UserFeedModel.findOneAndUpdate(filter, update, { new: true });
        }));
    }
}

module.exports = PS;
