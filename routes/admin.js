"use strict";

// Modules
const router = require("express").Router();
const mongoose = require("mongoose");
const devErrors = require("../helpers/devErrors");

// Models
require("../models/Category");
const Category = mongoose.model("categories");
require("../models/Post");
const Post = mongoose.model("posts");
require("../models/Commentary");
const Commentary = mongoose.model("commentaries");

// Helpers
const {isLogged} = require("../helpers/hasPermission");
const {isAdmin} = require("../helpers/hasPermission");

// Other
const minSlugChar = 3;
const maxTitleChar = 100;

// Routes
router.get("/", isLogged, isAdmin, (req, res) => {
    res.render("admin/admin");
});

router.get("/categories", isLogged, isAdmin, (req, res) => {
    Category.find().sort({category: 1}).lean().then((categories) => {
        res.render("admin/categories/all", {categories: categories});
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/admin");
    });
});
router.get("/category", isLogged, isAdmin, (req, res) => {
    res.redirect("/admin/categories");
});
router.get("/category/:slug", isLogged, isAdmin, (req, res) => {
    Category.findOne({slug: req.params.slug}).sort({date: 1}).lean().then((category) => {
        if (category) {
            Post.find({category: category.category}).lean().then((posts) => {
                res.render("admin/categories/specific", {category: category, posts: posts});
            }).catch((error) => {
                devErrors.throw.db(error);
                res.redirect("/admin/categories");
            });
        } else {
            req.flash("error_msg", "The requested category doesn't exist.");
            res.redirect("/admin/categories");
        }
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/admin/categories");
    });
});

router.get("/categories/add", isLogged, isAdmin, (req, res) => {
    res.render("admin/categories/add", {minSlug: minSlugChar});
});
router.post("/categories/add", isLogged, isAdmin, (req, res) => {
    Category.findOne({slug: req.body.slug}).lean().then((category) => {
        const errors = [];
        if (category) {
            errors.push({error: "There's already a category with this slug."});
        }
        if (req.body.slug < minSlugChar) {
            errors.push({error: `The slug is too short (minimum  ${minSlugChar} characters).`});
        }
        if (errors.length > 0) {
            res.render("admin/categories/add", {errors: errors, minSlug: minSlugChar});
        } else {
            const newCategory = {
                category: req.body.category,
                slug: req.body.slug,
                date: req.body.date
            };
            new Category(newCategory).save().then(() => {
                console.log("New category saved! Info:");
                console.log(newCategory);
                req.flash("success_msg", "Category successfully saved!");
                res.redirect("/admin/categories");
            }).catch((error) => {
                devErrors.throw.db(error);
                res.redirect("/admin/categories");
            });
        }
    }).catch((error) => {
        devErrors.throw.db(error);
    });
});

router.get("/categories/edit", isLogged, isAdmin, (req, res) => {
    res.redirect("/admin/categories");
});
router.get("/categories/edit/:slug", isLogged, isAdmin, (req, res) => {
    Category.findOne({slug: req.params.slug}).lean().then((category) => {
        if (category) {
            res.render("admin/categories/edit", {category: category, minSlug: minSlugChar});
        } else {
            req.flash("error_msg", "Category not found.");
            res.redirect("/admin/categories");
        }
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/admin/categories");
    });
});
router.post("/categories/edit", isLogged, isAdmin, (req, res) => {
    Category.findOne({_id: req.body.id}).then((category) => {
        Category.findOne({slug: req.body.slug, _id: {$nin: [req.body.id]}}).then((repeatedCategory) => {
            if (repeatedCategory) {
                req.flash("error_msg", "There's already a category with this slug.");
                res.redirect(`/admin/categories/edit/${req.body.previous_slug}`);
            } else if (req.body.slug.length < minSlugChar) {
                req.flash("error_msg", `The slug is too short (minimum ${minSlugChar} characters).`);
                res.redirect(`/admin/categories/edit/${req.body.previous_slug}`);
            } else {
                category.category = req.body.category;
                category.slug = req.body.slug;
                category.save().then(() => {
                    req.flash("success_msg", `Category "${req.body.category}" successfully saved!`);
                    res.redirect("/admin/categories");
                }).catch((error) => {
                    devErrors.throw.db(error);
                    res.redirect("/admin/categories");
                });
            }
        }).catch((error) => {
            devErrors.throw.db(error);
            res.redirect("/admin/categories");
        });
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/admin/categories");
    });
});
router.get("/categories/delete/:slug", isLogged, isAdmin, (req, res) => {
    Category.findOne({slug: req.params.slug}).lean().then((category) => {
        if (category) {
            res.render("admin/categories/delete", {category: category});
        } else {
            req.flash("error_msg", "Category not found.");
            res.redirect("/admin/categories");
        }
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/admin/categories");
    });
});
router.post("/categories/delete", isLogged, isAdmin, (req, res) => {
    Category.deleteOne({slug: req.body.slug}).then(() => {
        Post.deleteMany({category: req.body.category}).then(() => {
            req.flash("success_msg", `Category ${req.body.category} successfully deleted!`);
            res.redirect("/admin/categories");
        }).catch((req, error) => {
            devErrors.throw.db(error);
            res.redirect("/admin/categories");
        });
    }).catch((req, error) => {
        devErrors.throw.db(error);
        res.redirect("/admin/categories");
    });
});
router.get("/categories/delete", isLogged, isAdmin, (req, res) => {
    res.redirect("/admin/categories");
});
router.get("/categories/deleteAll", isLogged, isAdmin, (req, res) => {
    res.render("admin/categories/deleteAll");
});
router.post("/categories/deleteAll", isLogged, isAdmin, (req, res) => {
    Category.deleteMany().then(() => {
        Post.deleteMany().then(() => {
            Commentary.deleteMany().then(() => {
                req.flash("success_msg", "All categories, posts and commentaries have been successfully deleted!");
                res.redirect("/admin/categories");
            }).catch((error) => {
                devErrors.throw.db(error);
                res.redirect("/admin/categories");
            })
        }).catch((error) => {
            devErrors.throw.db(error);
            res.redirect("/admin/categories");
        });
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/admin/categories");
    });
});

router.get("/posts", isLogged, isAdmin, (req, res) => {
    Post.find().sort({date: -1}).lean().then((posts) => {
        res.render("admin/posts/all", {posts: posts});
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/admin");
    });
});
router.get("/posts/add", isLogged, isAdmin, (req, res) => {
    Category.find().sort({category: 1}).lean().then((categories) => {
        if (categories[0]) {
            res.render("admin/posts/add", {errors: null, categories: categories, minSlug: minSlugChar});
        } else {
            req.flash("error_msg", "It isn't possible to create a post because there's no categories created.");
            res.redirect("/admin/posts");
        }
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/admin/posts");
    });
});
router.post("/posts/add", isLogged, isAdmin, (req, res) => {
    const errors = [];
    if (req.body.category == "0") {
        errors.push({error: "Invalid category."});
    }
    if (req.body.title > 100) {
        errors.push({error: `Post's title is too big (maximum ${maxTitleChar} characters).`});
    }
    if (req.body.slug.length < minSlugChar) {
        errors.push({error: `Post's slug is too short (minimum ${minSlugChar} characters).`});
    }
    Post.findOne({slug: req.body.slug}).then((post) => {
        if (post) {
            errors.push({error: "The informed slug already exists."});
        }
        if (errors.length > 0) {
            Category.find().lean().then((categories) => {
                res.render("admin/posts/add", {errors: errors, categories: categories, minSlug: minSlugChar});
            }).catch((error) => {
                devErrors.throw.db(error);
                res.redirect("/admin/posts/add");
            });
        } else {
            const newPost = {
                title: req.body.title,
                description: req.body.description,
                category: req.body.category,
                post: req.body.post,
                slug: req.body.slug,
                author: req.body.author
            };
            new Post(newPost).save().then(() => {
                console.log("New post saved! Info:");
                console.log(newPost);
                req.flash("success_msg", "Post successfully saved!");
                res.redirect("/admin/posts");
            }).catch((error) => {
                devErrors.throw.db(error);
            });
        }
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/admin/posts/add");
    });
});
router.get("/posts/read", isLogged, isAdmin, (req, res) => {
    res.redirect("/admin/posts");
});
router.get("/posts/read/:slug", isLogged, isAdmin, (req, res) => {
    Post.findOne({slug: req.params.slug}).lean().then((post) => {
        if (post) {
            Commentary.find({post: req.params.slug, reference: ""}).sort({date: -1}).lean().then((commentaries) => {
                Commentary.find({post: req.params.slug, reference: {$nin: [""]}}).sort({date: 1}).lean().then((answers) => {
                    res.render("admin/posts/read", {post: post, commentaries: commentaries, answers: answers});
                }).catch((error) => {
                    devErrors.throw.db(error);
                    res.redirect("/admins/posts");
                });
            }).catch((error) => {
                devErrors.throw.db(error);
                res.redirect("/admin/posts");
            });
        } else {
            req.flash("error_msg", "Post not found.");
            res.redirect("/admin/posts");
        }
    });
});
router.get("/posts/edit/:slug", isLogged, isAdmin, (req, res) => {
    Post.findOne({slug: req.params.slug}).lean().then((post) => {
        if (post) {
            Category.find().sort({category: 1}).lean().then((categories) => {
                if (categories[0]) {
                    res.render("admin/posts/edit", {categories: categories, post: post});
                } else {
                    req.flash("error_msg", "It isn't possible to edit this post because there's no created categories.");
                    res.redirect("/admin/posts");
                }
            }).catch((error) => {
                devErrors.throw.db(error);
                res.redirect("/admin/posts");
            });
        } else {
            req.flash("error_msg", "Post not found.");
            res.redirect("/admin/posts");
        }
    });
});
router.post("/posts/edit", isLogged, isAdmin, (req, res) => {
    Post.findOne({slug: req.body.slug, _id: {$nin: [req.body.id]}}).then((equalSlug) => {
        if (equalSlug) {
            req.flash("error_msg", "The chosen slug isn't available.");
            res.redirect(`/admin/posts/edit/${req.body.slug}`);
        } else {
            Post.findOne({_id: req.body.id}).then((post) => {
                if (req.body.category !== 0) {
                    if (req.body.slug < minSlugChar) {
                        req.flash("error_msg", `The chosen slug is too short (minimum ${minSlugChar} characters).`);
                        res.redirect(`/admin/posts/edit/${req.body.slug}`);
                    } else {
                        post.title = req.body.title;
                        post.description = req.body.description;
                        post.category = req.body.category;
                        post.post = req.body.post;
                        post.slug = req.body.slug;
                        post.save().then(() => {
                            req.flash("success_msg", "Post successfully edited!");
                            res.redirect("/admin/posts");
                        }).catch((error) => {
                            devErrors.throw.db(error);
                            res.redirect(`/admin/posts`);
                        });
                    }
                } else {
                    req.flash("error_msg", "Invalid category. Please create a category to create a post.");
                    res.redirect("/admin/posts");
                }
            }).catch((error) => {
                devErrors.throw.db(error);
                res.redirect(`/admin/posts/edit/${req.body.slug}`);
            });
        }
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect(`/admin/posts/edit/${req.body.slug}`);
    });
});
router.get("/posts/edit", isLogged, isAdmin, (req, res) => {
    res.redirect("/admin/posts");
});
router.get("/posts/delete/:slug", isLogged, isAdmin, (req, res) => {
    Post.findOne({slug: req.params.slug}).lean().then((post) => {
        if (post) {
            res.render("admin/posts/delete", {post: post});
        } else {
            req.flash("error_msg", "Post not found.");
            res.redirect("/admin/posts");
        }
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/admin/posts");
    });
});
router.post("/posts/delete", isLogged, isAdmin, (req, res) => {
    Post.deleteOne({slug: req.body.slug}).then(() => {
        req.flash("success_msg", "Post successfully edited!");
        res.redirect("/admin/posts");
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/admin/posts");
    });
});
router.get("/posts/delete", isLogged, isAdmin, (req, res) => {
    res.redirect("/admin/posts");
});

module.exports = router;