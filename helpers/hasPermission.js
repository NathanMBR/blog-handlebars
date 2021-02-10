"use strict";

module.exports = {
    isLogged: (req, res, next) => {
        if (req.isAuthenticated()) {
            return next();
        } else {
            req.flash("warning_msg", "You must be logged to access this content.");
            res.redirect("/users/login");
        }
    },
    isAdmin: (req, res, next) => {
        if (req.user.role === 1) {
            return next();
        } else {
            req.flash("error_msg", "You haven't permission to access this page.");
            res.redirect("/home");
        }
    },
    isNotLogged: (req, res, next) => {
        if (req.isAuthenticated()) {
            req.flash("success_msg", "You're already logged in!");
            res.redirect("/home");
        } else {
            return next();
        }
    }
};