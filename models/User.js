"use strict";

// Modules
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Model
const User = new Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: Number,
        default: 0
    },
    date: {
        type: Date,
        default: Date.now()
    }
});
mongoose.model("users", User);