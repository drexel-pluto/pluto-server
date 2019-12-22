// Imports the Google Cloud client library
const {Storage} = require('@google-cloud/storage');
const stream = require('stream');
var uuid = require('uuid');

// Creates a client
const storage = new Storage();

const BUCKET_NAME = 'pluto_images';
const bucket = storage.bucket(BUCKET_NAME);



// These options will allow temporary read access to the file

var getSignedUrl = function(filename) {
    const options = {
        action: 'write',
        expires: '03-17-2025',
    };
    // Get a signed URL for the file
    return storage
      .bucket(BUCKET_NAME)
      .file(filename)
      .getSignedUrl(options)
      .then(results => {
        const url = results[0];
        return url;
        // console.log(`The signed url for ${filename} is ${url}.`);
      });
}

var uploadMedia = async function(media) {
    return new Promise((resolve, reject) => {
        var filename = uuid.v4();
        var bufferStream = new stream.PassThrough();
        bufferStream.end(Buffer.from(media, 'base64'));
        return bufferStream.pipe(
            bucket.file(filename).createWriteStream({
                gzip: true,
                public: true,
                validation: "md5",
                metadata: {
                    contentType: 'image/jpeg',
                }
            })
            .on('error', function(err) {
                return reject(err);
            })
            .on('finish', function(data) {
                return resolve(getPublicThumbnailUrlForItem(filename));
            })
        );
    });
}

var getPublicThumbnailUrlForItem = filename => {
    return `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`
  }

module.exports = {getSignedUrl, uploadMedia};
