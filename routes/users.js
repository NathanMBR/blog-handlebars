"use strict";

// Modules
const router = require("express").Router();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const devErrors = require("../helpers/devErrors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Models
require("../models/User");
const User = mongoose.model("users");
require("../models/Commentary");
const Commentary = mongoose.model("commentaries");
require("../models/Post");
const Post = mongoose.model("posts");
require("../models/Profile");
const Profile = mongoose.model("profiles");

// Helpers
const {isNotLogged} = require("../helpers/hasPermission");
const {isLogged} = require("../helpers/hasPermission");

// Configs
const regExp = /[^a-zA-Z\d]/g;

const minSize = {
    username: 3,
    password: 8
};

const multerConfig = require("../config/multer");
const upload = multer(multerConfig);

// Routes
router.get("/", (req, res) => {
    
    res.redirect("/home");
});

router.get("/signup", isNotLogged, (req, res) => {
    res.render("users/signup", {minSize: minSize});
});
router.post("/signup", isNotLogged, (req, res) => {
    const formData = {
        username: req.body.username,
        email: req.body.email,
        email2: req.body.email2,
        password: req.body.password,
        password2: req.body.password2
    };
    const errors = [];
    if (req.body.username.length < minSize.username) {
        errors.push({error: `The chosen username is too short (minimum ${minSize.username} characters).`});
    }
    if (req.body.email !== req.body.email2) {
        errors.push({error: "The e-mails do not match."});
    }
    if (req.body.password !== req.body.password2) {
        errors.push({error: "The passwords do not match."});
    } else {
        if (req.body.password.length < minSize.password) {
            errors.push({error: `The chosen password is too short (minimum ${minSize.password} characters).`});
        }
    }
    if (req.body.username.match(regExp)) {
        errors.push({error: "Invalid characters in username (must contain only letters and numbers)."});
    }
    if (errors.length > 0) {
        res.render("users/signup", {formData: formData, errors: errors, minSize: minSize});
    } else {
        User.findOne({username: req.body.username}).then((username) => {
            User.findOne({email: req.body.email}).then((email) => {
                if (username) {
                    errors.push({error: "Username already registered."});
                }
                if (email) {
                    errors.push({error: "E-mail already registered."});
                }
                if (errors.length > 0) {
                    res.render("users/signup", {formData: formData, errors: errors, minSize: minSize});
                } else {
                    const newUser = {
                        username: req.body.username,
                        email: req.body.email,
                        password: req.body.password
                    };
                    bcrypt.genSalt(10, (error, salt) => {
                        bcrypt.hash(newUser.password, salt, (error, hash) => {
                            if (error) {
                                devErrors.throw.db(error);
                                res.redirect("/home");
                            } else {
                                newUser.password = hash;
                                new User(newUser).save().then(() => {
                                    console.log("New account registered! Info:");
                                    console.log(newUser);
                                    User.findOne(newUser).lean().then((user) => {
                                        const accountConfig = {
                                            userId: user._id
                                        };
                                        new Profile(accountConfig).save().then(() => {
                                            console.log("Account successfully configured!");
                                            req.flash("success_msg", "Account successfully registered! Log in to use it.");
                                            res.redirect("/users/login");
                                        }).catch((error) => {
                                            console.log("ERRO: Account created with conflicted configurations. Info:");
                                            console.log(error);
                                            req.flash("warning_msg", "Your account has been created, however, some configurations may have errors. Contact an administrator if you see any abnormalities.");
                                            res.redirect("/home");
                                        });
                                    }).catch((error) => {
                                        console.log("ERRO: Account created with conflicted configurations. Info:");
                                        console.log(error);
                                        req.flash("warning_msg", "Your account has been created, however, some configurations may have errors. Contact an administrator if you see any abnormalities.");
                                        res.redirect("/home");
                                    });
                                }).catch((error) => {
                                    devErrors.throw.db(error);
                                    res.redirect("/home");
                                });
                            }
                        });
                    });
                }
            }).catch((error) => {
                devErrors.throw.db(error);
                res.redirect("/home");
            });
        }).catch((error) => {
            devErrors.throw.db(error);
            res.redirect("/home");
        });
    }
});
router.get("/login", isNotLogged, (req, res) => {
    res.render("users/login");
});
router.post("/login", isNotLogged, (req, res, next) => {
    passport.authenticate("local", {
        successRedirect: "/home",
        failureRedirect: "/users/login",
        failureFlash: true
    })(req, res, next);
});
router.get("/logout", isLogged, (req, res) => {
    req.logout();
    req.flash("success_msg", "Successfully logged out!");
    res.redirect("/home");
});

router.get("/profile", isLogged, (req, res) => {
    res.redirect(`/users/profile/${res.locals.username}`); 
});
router.get("/profile/:username", (req, res) => {
    User.findOne({username: req.params.username}).lean().then((user) => {
        if (user) {
            Commentary.find({author: req.params.username, reference: ""}).sort({date: -1}).lean().then((commentaries) => {
                Commentary.find({author: req.params.username, reference: {$nin: [""]}}).sort({date: -1}).lean().then((answers) => {
                    Post.find({author: req.params.username}).sort({date: -1}).lean().then((posts) => {
                        Profile.findOne({userId: user._id}).lean().then((profile) => {
                            res.render("users/profile", {user: user, commentaries: commentaries, answers: answers, posts: posts, profile: profile, url: `/img/user/${profile.photo}`});
                        }).catch((error) => {
                            devErrors.throw.db(error);
                            res.redirect("/home");
                        });
                    }).catch((error) => {
                        devErrors.throw.db(error);
                        res.redirect("/home");
                    });
                }).catch((error) => {
                    devErrors.throw.db(error);
                    res.redirect("/home");
                });
            }).catch((error) => {
                devErrors.throw.db(error);
                res.redirect("/home");
            });
        } else {
            req.flash("error_msg", "User not found.");
            res.redirect("/home");
        }
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/home");
    });
});
router.get("/profile/:username/edit", isLogged, (req, res) => {
    User.findOne({username: req.user.username}).lean().then((user) => {
        Profile.findOne({userId: user._id}).lean().then((profile) => {
            res.render("users/editProfile", {user: user, profile: profile});
        }).catch((error) => {
            devErrors.throw.db(error);
            res.redirect("/users/profile");
        });
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/users/profile");
    });
});
router.post("/profile/edit", isLogged, upload.single("photo"), (req, res) => {
    if (req.body.user === res.locals.username) {
        User.findOne({username: req.body.user}).lean().then((user) => {
            Profile.findOne({userId: user._id}).then((profile) => {
                req.body.publicEmail ? profile.isEmailPublic = true : profile.isEmailPublic = false;
                if (req.file) {
                    if (profile.photo !== "defaultUser.png") {
                        fs.unlink(path.resolve(__dirname, "..", "public", "img", "user", profile.photo), (error) => {
                            if (error) {
                                console.log("An error ocurred while trying to delete an old profile picture. Info:");
                                console.log(error);
                                req.flash("error_msg", "An error ocurred while trying to update your profile picture. Please, try again.");
                                res.redirect(`/users/profile/${req.body.user}`);
                            } else {
                                console.log("New profile picture uploaded! Info:");
                                console.log(req.file);
                                const newName = user.username + path.extname(req.file.filename);
                                const newNamePath = req.file.destination + "\\" + newName;
                                fs.rename(req.file.path, newNamePath, error => {
                                    if (error) {
                                        console.log("An error ocurred while trying to change the picture's name. Info:");
                                        console.log(error);
                                        req.flash("error_msg", "An error ocurred while trying to update your profile picture. Please, try again.");
                                        res.redirect(`/users/profile/${req.body.user}`);
                                    } else {
                                        profile.photo = newName;
                                        profile.save().then(() => {
                                            req.flash("success_msg", "New profile picture successfully saved!");
                                            res.redirect(`/users/profile/${req.body.user}`);
                                        }).catch((error) => {
                                            devErrors.throw.db(error);
                                            res.redirect(`/users/profile/${req.body.user}`);
                                        });
                                    }
                                });
                            }
                        });
                    } else {
                        console.log("New profile picture uploaded! Info:");
                        console.log(req.file);
                        const newName = user.username + path.extname(req.file.filename);
                        const newNamePath = req.file.destination + "\\" + newName;
                        fs.rename(req.file.path, newNamePath, error => {
                            if (error) {
                                console.log("An error ocurred while trying to change the picture's name. Info:");
                                console.log(error);
                                req.flash("error_msg", "An error ocurred while trying to update your profile picture. Please, try again.");
                                res.redirect(`/users/profile/${req.body.user}`);
                            } else {
                                profile.photo = newName;
                                profile.save().then(() => {
                                    req.flash("success_msg", "New profile picture successfully saved!");
                                    res.redirect(`/users/profile/${req.body.user}`);
                                }).catch((error) => {
                                    devErrors.throw.db(error);
                                    res.redirect(`/users/profile/${req.body.user}`);
                                });
                            }
                        });
                    }
                } else {
                    profile.save().then(() => {
                        req.flash("success_msg", "Your profile configurations have been successfully saved!");
                        res.redirect(`/users/profile/${req.body.user}`);
                    }).catch((error) => {
                        devErrors.throw.db(error);
                        res.redirect();
                    });
                }
            }).catch((error) => {
                devErrors.throw.db(error);
                res.redirect(`/users/profile/${req.body.user}`);
            });
        }).catch((error) => {
            devErrors.throw.db(error);
            res.redirect(`/users/profile/${req.body.user}`);
        });
    } else {
        req.flash("error_msg", "Invalid form.");
        res.redirect(`/users/profile/${res.locals.username}`);
    }
});

module.exports = router;