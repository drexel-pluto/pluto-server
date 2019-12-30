const express = require('express');
const router = express.Router();
const PostService = require('../services/PostService');
const ErrorService = require('../services/ErrorService');

router.post('/create', (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
                text: req.body.text,
                // media: req.body.media,
                durationDaysUntilArchive: req.body.daysUntilArchive,
                audienceIds: req.body.audienceIds,
                tag: req.body.tag
            }
            const post = await PostService.createPost(params);
            return res.status(200).send(post);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'PostController', '/create', err);
            return res.status(500).send(error);
        }
    })();
});

module.exports = router;
