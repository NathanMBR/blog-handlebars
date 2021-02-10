"use strict";

const devErrors = {
    throw: {
        db: (error) => {
            console.log("WARNING: It wasn't possible to get data from the database. Error:");
            console.log(error);
        }
    }
};

module.exports = devErrors;