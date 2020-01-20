const EmailModel = require('../models/Email');
const { isEmpty } = require('./helpers');
const EmailValidator = require('email-validator');

module.exports = () => {
    return {
        initialize(){
            US = this.parent.US;
            PuS = this;
        },
        async checkValidEmail(params) {
            return new Promise((resolve, reject) => {
                const isValid = EmailValidator.validate(params.email);
                if (isValid) {
                    resolve()
                } else {
                    reject('Invalid email.')
                }
            });
        },
        async isEmailAlreadySaved(params) {
            const sentEmail = params.email.toString();   
            const email = await EmailModel.findOne({ email: sentEmail });
            return !isEmpty(email);
        },
        // Dont want to return failures here, even if email exists
        // A failure will unnecessarily trip up front-end
        async addToEmailList(params){
            await PuS.checkValidEmail(params);
            const isEmailAlreadySaved = await PuS.isEmailAlreadySaved(params);

            if (isEmailAlreadySaved) {
                return params.email;
            }

            await EmailModel.create({
                email: params.email,
                ip: params.ip
            });
            return params.email;
        }
    }
}
