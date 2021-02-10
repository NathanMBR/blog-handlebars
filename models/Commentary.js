"use strict";

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Commentary = new Schema({
    author: {
        type: String,
        required: true
    },
    commentary: {
        type: String,
        required: true
    },
    post: {
        type: String,
        required: true
    },
    reference: {
        type: String,
        required: false
    },
    date: {
        type: Date,
        default: Date.now()
    }
});
mongoose.model("commentaries", Commentary);