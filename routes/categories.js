"use strict";

// Modules
const router = require("express").Router();
const mongoose = require("mongoose");

// Models
require("../models/Category");
const Category = mongoose.model("categories");
require("../models/Post");
const Post = mongoose.model("posts");

// Other
const devErrors = require("../helpers/devErrors");

// Routes
router.get("/", (req, res) => {
    Category.find().sort({category: 1}).lean().then((categories) => {
        res.render("categories/all", {categories: categories});
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/home");
    });
});

router.get("/more", (req, res) => {
    res.redirect("/categories");
});
router.get("/more/:slug", (req, res) => {
    Category.findOne({slug: req.params.slug}).lean().then((category) => {
        if (category) {
            Post.find({category: category.category}).lean().then((posts) => {
                res.render("categories/more", {category: category, posts: posts});
            }).catch((error) => {
                devErrors.throw.db(error);
                res.redirect("/categories");
            });
        } else {
            req.flash("error_msg", "Category not found.");
            res.redirect("/categories");
        }
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/categories");
    });
});

// Export
module.exports = router;