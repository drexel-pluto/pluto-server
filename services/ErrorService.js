const ErrorModel = require('../models/Error');
const { isEmpty } = require('./helpers');

module.exports = {
    async buildError(status, ctrl, route, msg){
        const errorObj = {
            errMessage: msg,
            errCode: status,
            isClientErr: true,
            whichController: ctrl,
            whichRoute: route
        }
        return new ErrorModel(errorObj);
    },
    createError(status, ctrl, route, msg){
        return new Promise(resolve => {
            const errorObj = {
                errMessage: msg,
                errCode: status,
                isClientErr: true,
                whichController: ctrl,
                whichRoute: route
            }
            ErrorModel.create(errorObj)
                .then(builtErr => {
                    resolve(builtErr);
                })
                .catch(err => {
                    errorObj.sucessfulSave = false;
                    errorObj.unsuccessfulSaveError = err;
                    resolve(errorObj);
                });
        });
    },
    createModelError(status, msg, model, defcon){
        return new Promise(resolve => {
            let message = msg;
            if (isEmpty(message)) message = "No message specified :-(";
    
            const errorObj = {
                errMessage: message,
                errCode: status,
                isDBErr: true,
                whichModel: model,
                defcon
            }
            ErrorModel.create(errorObj)
                .then(builtErr => {
                    resolve(builtErr);
                })
                .catch(err => {
                    errorObj.sucessfulSave = false;
                    errorObj.unsuccessfulSaveError = err;
                    resolve(errorObj);
                });
        });
    }
}
