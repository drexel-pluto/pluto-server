module.exports = {
    maxNumberOfFriendsAllowed: 50,
    getRandomDefaultPic: function() {
        function getRandomInt(min, max) {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
        }
        const rand = getRandomInt(0, 2);
        return this.defaultPics[rand];
    },
    defaultPics: [
        "https://storage.googleapis.com/pluto-social-images/1583442630837female_avatar.jpg",
        "https://storage.googleapis.com/pluto-social-images/1583442630856male_avatar.jpg"
    ],
    imageSizes: {
        profile: 500,
        content: 1080
    }
}
