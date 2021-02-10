"use strict";

// Modules
const localStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const devErrors = require("../helpers/devErrors");

// Models
require("../models/User");
const User = mongoose.model("users");

module.exports = (passport) => {
    passport.use(new localStrategy({usernameField: "email", passwordField: "password"}, (email, password, done) => {
        User.findOne({email: email}).then((user) => {
            if (user) {
                bcrypt.compare(password, user.password, (error, match) => {
                    if (match) {
                        return done(null, user);
                    } else {
                        return done(null, false, {message: "E-mail e/ou senha incorretos."});
                    }
                });
            } else {
                return done(null, false, {message: "E-mail não cadastrado."});
            }
        }).catch((error) => {
            devErrors.throw.db(error);
        });
    }));
    passport.serializeUser((user, done) => {
        done(null, user._id);
    });
    passport.deserializeUser((id, done) => {
        User.findById(id, (error, user) => {
            done(error, user);
        });
    });
}