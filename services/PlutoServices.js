const FriendService = require('./FriendService');
const UserService = require('./UserService');
const GroupService = require('./GroupService');
const PostService = require('./PostService');
const PublicService = require('./PublicService');
const HelperService = require('./helpers');
const ImageService = require('./ImageService');

const PlutoServices = {
    FS: FriendService(),
    GS: GroupService(),
    PS: PostService(),
    US: UserService(),
    PuS: PublicService(),
    IS: ImageService(),
    init : function() {
        this.FS.parent = this;
        this.GS.parent = this;
        this.PS.parent = this;
        this.US.parent = this;
        this.PuS.parent = this;
        this.IS.parent = this;

        this.FS.initialize();
        this.GS.initialize();
        this.PS.initialize();
        this.US.initialize();
        this.PuS.initialize();
        this.IS.initialize();

        delete this.init;
        return this;
    }
};

module.exports = PlutoServices;
