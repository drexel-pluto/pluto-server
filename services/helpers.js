module.exports = {
    
    //Checks to see if value is in array
    //To use, require this file as helpers
    //helpers.contains.call(TESTARRAY, TEST VALUE)
    //Returns true or false
    contains(needle) {
        // Per spec, the way to identify NaN is that it is not equal to itself
        var findNaN = needle !== needle;
        var indexOf;

        if(!findNaN && typeof Array.prototype.indexOf === 'function') {
            indexOf = Array.prototype.indexOf;
        } else {
            indexOf = function(needle) {
                var i = -1, index = -1;

                for(i = 0; i < this.length; i++) {
                    var item = this[i];

                    if((findNaN && item !== item) || item === needle) {
                        index = i;
                        break;
                    }
                }

                return index;
            };
        }

        return indexOf.call(this, needle) > -1;
    },

    capitalize(string){
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

    isEmpty(value){
        if (Array.isArray(value)){
            if (value.length === 0){
                return true;
            }
        }

        // Checks for {}
        if (typeof value === 'object'){
            if (Object.entries(value).length === 0 && value.constructor === Object) {
                return true;
            } else {
                return false;
            }
        }

        switch (value){
            case '':
                return true;
                break;

            case null:
                return true;
                break;

            case undefined:
                return true;
                break;

            case []:
                return true;
                break;

            default:
                return false;
                break;
        }
    },
    convertMilesToMeters(num){
        const val = parseFloat(num);
        return Math.round(val * 1609.34);
    },
    async asyncForEach(array, callback) {
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array);
        }
    }
};
