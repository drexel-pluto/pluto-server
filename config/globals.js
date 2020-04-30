const globals = {
    tokenExpiration: '365d',
    maxNumberOfFriendsAllowed: 50,
    getRandomDefaultPic: function() {
        function getRandomInt(min, max) {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
        }
        const rand = getRandomInt(0, 2);
        return globals.defaultPics[rand];
    },
    defaultPics: [
        "https://storage.googleapis.com/pluto-social-images/1588260460805female_avatar.jpeg",
        "https://storage.googleapis.com/pluto-social-images/1588260512771male_avatar.jpeg"
    ],
    imageSizes: {
        profile: 500,
        content: 1080
    },
    acceptedFiletypes: ['image/png', 'image/jpg', 'image/jpeg', 'image/heif', 'image/heic']
}

module.exports = globals;
