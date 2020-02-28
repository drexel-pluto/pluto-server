const FriendService = require('./FriendService');
const UserService = require('./UserService');
const GroupService = require('./GroupService');
const PostService = require('./PostService');
const PublicService = require('./PublicService');
const CommentService = require('./CommentService');
const HelperService = require('./helpers');
const ImageService = require('./ImageService');
const NotificationService = require('./NotificationService');

const PlutoServices = {
    CS: CommentService(),
    FS: FriendService(),
    GS: GroupService(),
    IS: ImageService(),
    NS: NotificationService(),
    PS: PostService(),
    US: UserService(),
    PuS: PublicService(),
    init : function() {
        this.CS.parent = this;
        this.FS.parent = this;
        this.GS.parent = this;
        this.IS.parent = this;
        this.NS.parent = this;
        this.PS.parent = this;
        this.US.parent = this;
        this.PuS.parent = this;

        this.CS.initialize();
        this.FS.initialize();
        this.GS.initialize();
        this.IS.initialize();
        this.NS.initialize();
        this.PS.initialize();
        this.US.initialize();
        this.PuS.initialize();

        delete this.init;
        return this;
    }
};

module.exports = PlutoServices;
