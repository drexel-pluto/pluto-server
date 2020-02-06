const { Storage } = require('@google-cloud/storage');

// Link to json file gcloud provides
const keys = JSON.parse(process.env.GCLOUD);

// remove bad chars in their key lol
keys.private_key = keys.private_key.replace(/\\n/g, '\n');

// Bucket name
const CLOUD_BUCKET = 'pluto-social-images';
const storage = new Storage({ 
  projectId: 'pluto-social-267217',
  credentials: keys
});
const bucket = storage.bucket(CLOUD_BUCKET);

// Multer handles parsing multipart/form-data requests.
// This instance is configured to store images in memory.
// This makes it straightforward to upload to Cloud Storage.
// [START multer]
const Multer = require('multer');
const multer = Multer({
    storage: Multer.MemoryStorage,
    limits: {
        fileSize: 2 * 1024 * 1024 // no larger than 5mb
    }
});

module.exports = () => {
    var IS;
    return {
        initialize() {
            IS = this;
        },



        // Returns array of media
        async uploadMedia(files) {
            if (!files) {
                return [];
            }

            const mediaMap = files.map(file => {
                return new Promise((resolve, reject) => {
                    IS.sendUploadToGCS(file).then(url => {
                        resolve(url);
                    }).catch(err => {
                        reject(err);
                    });
                });
            });

            return Promise.all(mediaMap);
        },




        // Returns the public, anonymously accessible URL to a given Cloud Storage
        // object.
        // The object's ACL has to be set to public read.
        // [START public_url]
        async getPublicUrl (filename) {
            return `https://storage.googleapis.com/${CLOUD_BUCKET}/${filename}`;
        },


        // Express middleware that will automatically pass uploads to Cloud Storage.
        // req.file is processed and will have two new properties:
        // * ``cloudStorageObject`` the object name in cloud storage.
        // * ``cloudStoragePublicUrl`` the public url to the object.
        // [START process]
        sendUploadToGCS (passedFile) {
            return new Promise((resolve, reject) => {
                const gcsname = Date.now() + passedFile.originalname;
                const file = bucket.file(gcsname);
                const stream = file.createWriteStream({ metadata: { contentType: passedFile.mimetype }, resumable: false });
                
                if (!passedFile) { resolve(''); }
                
                stream.on('error', (err) => { reject(err); });
            
                stream.on('finish', () => {
                    file.makePublic().then(() => {
                        IS.getPublicUrl(gcsname).then(url => {
                            resolve(url);
                        });
                    });
                });
            
                stream.end(passedFile.buffer);
            });
        }
    }
}