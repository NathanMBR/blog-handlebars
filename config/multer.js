"use strict";

// Modules
const multer = require("multer");
const path = require("path");
const destination = path.resolve(__dirname, "..", "public", "img", "user");

// Config
module.exports = {
    dest: destination,
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, destination);
        },
        filename: (req, file, cb) => {
            cb(null, new Date().getTime() + file.originalname);
        }
    }),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            "image/jpeg",
            "image/pjpeg",
            "image/png",
            "image/gif"
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid image type."));
        }
    }
};