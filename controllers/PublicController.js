const express = require('express');
const router = express.Router();
const ErrorService = require('../services/ErrorService');
const PlutoServices = require('../services/PlutoServices');

// Make sure the services havent been initialized
if (typeof PlutoServices.init === "function") { 
    PlutoServices.init();
}

router.post('/email/save', (req, res) => {
    ( async () => {
        try {
            const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            const params = {
                email: req.body.email,
                ip: ip
            }
            const email = await PlutoServices.PuS.addToEmailList(params);
            return res.status(200).send(email);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'PublicController', '/email/save', err);
            return res.status(500).send(error);
        }
    })();
});

module.exports = router;
