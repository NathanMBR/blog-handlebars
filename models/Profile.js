"use strict";

// Modules
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ip = require("ip");

// Model
const Profile = new Schema({
    userId: {
        type: String,
        required: true
    },
    isEmailPublic: {
        type: Boolean,
        default: true
    },
    photo: {
        type: String,
        default: "defaultUser.png"
    }
});
mongoose.model("profiles", Profile);