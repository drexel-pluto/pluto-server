const { Storage } = require('@google-cloud/storage');
const globals = require('../config/globals');
const sharp = require("sharp");
const path = require('path');
const Helpers = require('../services/helpers');

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
        fileSize: 100 * 1024 * 1024 // no larger than 5mb
    }
});

const acceptedFileTypes = globals.acceptedFiletypes;

module.exports = () => {
    var IS;
    return {
        initialize() {
            IS = this;
        },



        // Returns array of URL strings
        async uploadMedia(files, isProfile=false) {
            if (!files) {
                return [];
            }

            await IS.ensureValidFiletypes(files);

            // if just one file, return single string
            if (files.length === 1) {
                return new Promise((resolve, reject) => {
                    IS.resize(files[0], isProfile)
                        .then((file) => IS.sendUploadToGCS(file))
                        .then(url => {
                            resolve(url);
                        }).catch(err => {
                            reject(err);
                        });
                });
            }

            if (files.length >= 1) {
                const mediaMap = files.map(file => {
                    return new Promise((resolve, reject) => {
                        IS.resize(file, isProfile)
                            .then((file) => IS.sendUploadToGCS(file))
                            .then(url => {
                                resolve(url);
                            }).catch(err => {
                                reject(err);
                            });
                    });
                });

                return Promise.all(mediaMap);
            }
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
        },
        resize (passedFile, isProfile=false) {
            let config = {
                width: globals.imageSizes.content,
                position: sharp.strategy.entropy,
                withoutEnlargement: true
            };

            if (isProfile) {
                //square ratio for profile pictures
                config.fit = sharp.fit.cover;
                config.width = globals.imageSizes.profile
                config.height = globals.imageSizes.profile
            }

            return new Promise((resolve, reject) => {
                sharp(passedFile.buffer)
                    .rotate()
                    .resize(config)
                    .toFormat('jpeg')
                    .toBuffer()
                    .then(function(outputBuffer) {
                        // rename from old filename
                        passedFile.originalname = path.parse(passedFile.originalname).name + ".jpeg";
                        passedFile.buffer = outputBuffer;
                        resolve(passedFile);
                    });
            });
        },
        async deleteFile(url) {
            // Creates a client
            const filename = await IS.getFilename(url);
            // Deletes the file from the bucket
            console.log(`Deleting gs://${CLOUD_BUCKET}/${filename}`);

            return await storage
              .bucket(CLOUD_BUCKET)
              .file(filename)
              .delete();
        },
        async getFilename(url) {
            return url.split('/')[4];
        },
        async ensureValidFiletypes(files) {
            return await Promise.all(files.map(async file => {
                const fileExt = file.mimetype;
                if (!Helpers.contains.call(acceptedFileTypes, fileExt.toString())) {
                    return Promise.reject(`Bad file type: ${fileExt}`);
                } else {
                    return fileExt;
                }
            }));
        }
    }
}
