"use strict";

// Modules
const express = require("express");
const app = express();
const Handlebars = require("handlebars");
const handlebars = require("express-handlebars");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
require("./config/auth")(passport);
const path = require("path");

// Routes Modules
const admin = require("./routes/admin");
const categories = require("./routes/categories");
const users = require("./routes/users");

// Models
require("./models/Category");
const Category = mongoose.model("categories");
require("./models/Post");
const Post = mongoose.model("posts");
require("./models/Commentary");
const Commentary = mongoose.model("commentaries");

// Helpers
const {isLogged} = require("./helpers/hasPermission");
const devErrors = require("./helpers/devErrors");

Handlebars.registerHelper("equal", (arg1, arg2, options) => {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});
Handlebars.registerHelper("dateFormatter", (date, chooser, options) => {
    const portugueseMonths = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const months = ["January ", "February ", "March ", "April ", "May ", "June ", "July ", "August ", "September ", "October ", "November ", "December "];
    let formattedDate = "";
    switch (chooser) {
        case 1:     // DD/MM/YY (portuguese format)
            if (date.getDate() < 10) {
                formattedDate = `0${date.getDate()}/`;
            } else {
                formattedDate = `${date.getDate()}/`;
            }
            if (date.getMonth() < 9) {
                formattedDate += `0${date.getMonth() + 1}/`;
            } else {
                formattedDate += `${date.getMonth() + 1}/`;
            }
            formattedDate += `${date.getFullYear()}`;
            break;
        case 2:     // DD/month/YY (in portuguese)
            if (date.getDate() < 10) {
                formattedDate = `0${date.getDate()} de `;
            } else {
                formattedDate = `${date.getDate()} de `;
            }
            formattedDate += portugueseMonths[date.getMonth()] + " de ";
            formattedDate += date.getFullYear();
            break;
        case 3:     // TIME (24 hours format)
            if (date.getHours() < 10) {
                formattedDate = `0${date.getHours()}:`;
            } else {
                formattedDate = `${date.getHours()}:`;
            }
            if (date.getMinutes() < 10) {
                formattedDate += `0${date.getMinutes()}`;
            } else {
                formattedDate += `${date.getMinutes()}`;
            }
            break;
        case 4:     // month DD, YYYY (english format)
            formattedDate = months[date.getMonth()];
            formattedDate += date.getDate();
            switch (date.getDate() % 10) {
                case 1:
                    date.getDate() === 11 ? formattedDate += "th, " : formattedDate += "st, ";
                    break;
                case 2:
                    date.getDate() === 12 ? formattedDate += "th, " : formattedDate += "nd, ";
                    break;
                case 3:
                    date.getDate() === 13 ? formattedDate += "th, " : formattedDate += "rd, ";
                    break;
                default:
                    formattedDate += "th, ";
                    break;
            }
            formattedDate += date.getFullYear();
            break;
        case 5:     // TIME (12 hours format)
            if (date.getHours() > 12) {
                formattedDate = `${date.getHours() - 12}:`;
                date.getMinutes() > 10 ? formattedDate += `${date.getMinutes()} ` : formattedDate += `0${date.getMinutes()} `;
                formattedDate += "PM";
            } else {
                formattedDate = `${date.getHours()}:`;
                date.getMinutes() > 10 ? formattedDate += `${date.getMinutes()} ` : formattedDate += `0${date.getMinutes()} `;
                formattedDate += "AM";
            }
            break;
        default:    // DD/MM/YY (portuguese format), TIME (24 hours format);
            if (date.getDate() < 10) {
                formattedDate = `0${date.getDate()}/`;
            } else {
                formattedDate = `${date.getDate()}/`;
            }
            if (date.getMonth() < 9) {
                formattedDate += `0${date.getMonth() + 1}/`;
            } else {
                formattedDate += `${date.getMonth() + 1}/`;
            }
            formattedDate += `${date.getFullYear()}, `;
            if (date.getHours() < 10) {
                formattedDate += `0${date.getHours()}:`;
            } else {
                formattedDate += `${date.getHours()}:`;
            }
            if (date.getMinutes() < 10) {
                formattedDate += `0${date.getMinutes()}`;
            } else {
                formattedDate += `${date.getMinutes()}`;
            }
            break;
    }
    return options.fn({formattedDate: formattedDate});
});

// Configs
const port = process.env.port || 80;

app.use(session({
    secret: "notSoSecret",
    resave: true,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());
app.use((req, res, next) => {
    res.locals.success_msg = req.flash("success_msg");
    res.locals.error_msg = req.flash("error_msg");
    res.locals.warning_msg = req.flash("warning_msg");

    res.locals.error = req.flash("error");
    res.locals.user = req.user || null;
    if (req.user) {
        res.locals.username = req.user.username || null;
        res.locals.admin = req.user.role || null;
    }

    next();
})

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.engine("handlebars", handlebars({defaultLayout: "main"}));
app.set("view engine", "handlebars");

mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost/blog", {useNewUrlParser: true, useUnifiedTopology: true}).then(() => {
    console.log("Successfully connected to MongoDB.");
    console.log("");
}).catch((error) => {
    console.log("Couldn't connect to MongoDB. Error:");
    console.log(error);
});

// Public
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.get("/", (req, res) => {
    res.redirect("/home");
});
app.get("/home", (req, res) => {
    Post.find().sort({date: -1}).lean().then((posts) => {
        res.render("index/home", {posts: posts});
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/error");
    });
});

app.get("/read", (req, res) => {
    res.redirect("/home");
});
app.get("/read/:slug", (req, res) => {
    Post.findOne({slug: req.params.slug}).lean().then((post) => {
        if (post) {
            Commentary.find({post: req.params.slug, reference: ""}).sort({date: -1}).lean().then((commentaries) => {
                Commentary.find({post: req.params.slug, reference: {$nin: [""]}}).sort({date: 1}).lean().then((answers) => {
                    Category.findOne({category: post.category}).lean().then((category) => {
                        res.render("index/read", {post: post, commentaries: commentaries, answers: answers, category: category});
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
            req.flash("error_msg", "Post not found.");
            res.redirect("/home");
        }
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/home");
    });
});
app.post("/read", isLogged, (req, res) => {
    if (req.body.author === res.locals.username) {
        const newCommentary = {
            author: req.body.author,
            commentary: req.body.commentary,
            post: req.body.post,
            reference: ""
        };
        new Commentary(newCommentary).save().then(() => {
            console.log(`New commentary in /read/${newCommentary.post} by ${newCommentary.author}:`);
            console.log(newCommentary);
            req.flash("success_msg", "Commentary successfully added!");
            res.redirect(`/read/${newCommentary.post}`);
        }).catch((error) => {
            devErrors.throw.db(error);
            res.redirect(`/read/${newCommentary.post}`);
        });
    } else {
        req.flash("error_msg", "Validation failure.");
        res.redirect("/home");
    }
});
app.post("/answer", isLogged, (req, res) => {
    Commentary.findOne({_id: req.body.id}).then((commentary) => {
        if (commentary) {
            if (req.body.author === res.locals.username) {
                const newAnswer = {
                    author: req.body.author,
                    commentary: req.body.answer,
                    post: req.body.post,
                    reference: req.body.id
                };
                new Commentary(newAnswer).save().then(() => {
                    console.log(`New answer in /read/${req.body.post} by ${req.body.author}:`);
                    console.log(newAnswer);
                    req.flash("success_msg", "Answer successfully sended!");
                    res.redirect(`/read/${req.body.post}`);
                }).catch((error) => {
                    devErrors.throw.db(error);
                    res.redirect(`/read/${req.body.post}`);
                });
            } else {
                req.flash("error_msg", "Validation failure.");
                res.redirect("/home");
            }
        } else {
            req.flash("error_msg", "Commentary not found.");
            res.redirect(`/read/${req.body.post}`);
        }
    }).catch((error) => {
        devErrors.throw.db(error);
    });
});

app.get("/commentary", (req, res) => {
    res.redirect("/home");
});
app.get("/commentary/edit", isLogged, (req, res) => {
    req.flash("warning_msg", "You need a commentary to edit it.");
    res.redirect("/home");
});
app.get("/commentary/edit/:id", isLogged, (req, res) => {
    Commentary.findOne({_id: req.params.id}).lean().then((commentary) => {
        if (commentary) {
            if (commentary.author === res.locals.username) {
                res.render("index/commentaries/edit", {commentary: commentary});
            } else {
                req.flash("error_msg", "You cannot edit this commentary, because you aren't its author.");
                res.redirect(`/read/${commentary.post}`);
            }
        } else {
            req.flash("error_msg", "Commentary not found.");
            res.redirect("/home");
        }
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/home");
    });
});
app.post("/commentary/edit", isLogged, (req, res) => {
    Commentary.findOne({_id: req.body.id}).lean().then((commentary) => {
        if (commentary) {
            if (commentary.author === res.locals.username) {
                commentary.commentary = req.body.commentary;
                commentary.save().then(() => {
                    req.flash("success_msg", "Commentary successfully edited!");
                    res.redirect(`/read/${commentary.post}`);
                }).catch((error) => {
                    devErrors.throw.db(error);
                    res.redirect("/home");
                });
            } else {
                req.flash("error_msg", "You cannot edit this commentary, because you aren't its author.");
                res.redirect(`/read/${commentary.post}`);
            }
        } else {
            req.flash("error_msg", "Commentary not found.");
            res.redirect("/home");
        }
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/home");
    });
});
app.get("/commentary/delete", isLogged, (req, res) => {
    req.flash("warning_msg", "You need a commentary to delete it.");
    res.redirect("/home");
});
app.get("/commentary/delete/:id", isLogged, (req, res) => {
    Commentary.findOne({_id: req.params.id}).lean().then((commentary) => {
        if (commentary) {
            if (commentary.author === res.locals.username) {
                res.render("index/commentaries/delete", {commentary: commentary});
            } else {
                req.flash("error_msg", "You cannot delete this commentary, because you aren't its author.");
                res.redirect(`/read/${commentary.post}`);
            }
        } else {
            req.flash("error_msg", "Commentary not found.");
            res.redirect("/home");
        }
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/home");
    });
});
app.post("/commentary/delete", isLogged, (req, res) => {
    Commentary.findOne({_id: req.body.id}).then((commentary) => {
        if (commentary) {
            if (commentary.author === res.locals.username) {
                Commentary.deleteMany({reference: req.body.id}).then(() => {
                    Commentary.deleteOne(commentary).then(() => {
                        req.flash("success_msg", "Commentary successfully deleted!");
                        res.redirect(`/read/${commentary.post}`);
                    }).catch((error) => {
                        devErrors.throw.db(error);
                        res.redirect(`/read/${commentary.post}`);
                    });
                }).catch((error) => {
                    devErrors.throw.db(error);
                    res.redirect(`/read/${commentary.post}`);
                });
            } else {
                req.flash("error_msg", "You cannot delete this commentary, because you aren't its author.");
                res.redirect(`/read/${commentary.post}`);
            }
        } else {
            req.flash("error_msg", "Commentary not found.");
            res.redirect("/home");
        }
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/home");
    });
});

app.get("/answer", (req, res) => {
    res.redirect("/home");
});
app.get("/answer/edit", isLogged, (req, res) => {
    req.flash("warning_msg", "You need an answer to edit it.");
    res.redirect("/home");
});
app.get("/answer/edit/:id", isLogged, (req, res) => {
    Commentary.findOne({_id: req.params.id}).lean().then((answer) => {
        if (answer) {
            if (answer.author === res.locals.username) {
                res.render("index/answers/edit", {answer: answer});
            } else {
                req.flash("error_msg", "You cannot edit this answer, because you aren't its author.");
                res.redirect("/home");
            }
        } else {
            req.flash("error_msg", "Answer not found.");
            res.redirect("/home");
        }
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/home");
    });
});
app.post("/answer/edit", isLogged, (req, res) => {
    Commentary.findOne({_id: req.body.id}).lean().then((answer) => {
        if (answer) {
            if (answer.author === res.locals.username) {
                answer.commentary = req.body.answer;
                answer.save().then(() => {
                    req.flash("success_msg", "Answer successfully edited!");
                    res.redirect(`/read/${answer.post}`);
                }).catch((error) => {
                    devErrors.throw.db(error);
                    res.redirect(`/read/${answer.post}`);
                });
            } else {
                req.flash("error_msg", "You cannot edit this answer, because you aren't its author.");
                res.redirect("/home");
            }
        } else {
            req.flash("error_msg", "Answer not found.");
            res.redirect("/home");
        }
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/home");
    });
});
app.get("/answer/delete", isLogged, (req, res) => {
    req.flash("warning_msg", "You need an answer to delete it.");
    res.redirect("/home");
});
app.get("/answer/delete/:id", isLogged, (req, res) => {
    Commentary.findOne({_id: req.params.id}).lean().then((answer) => {
        if (answer) {
            if (answer.author === res.locals.username) {
                res.render("index/answers/delete", {answer: answer});
            } else {
                req.flash("error_msg", "You cannot delete this answer, because you aren't its author.");
                res.redirect(`/read/${answer.post}`);
            }
        } else {
            req.flash("error_msg", "Answer not found.");
            res.redirect("/home");
        }
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/home");
    });
});
app.post("/answer/delete", isLogged, (req, res) => {
    Commentary.findOne({_id: req.body.id}).lean().then((answer) => {
        if (answer) {
            if (answer.author === res.locals.username) {
                Commentary.deleteOne(answer).then(() => {
                    req.flash("success_msg", "Answer successfully deleted!");
                    res.redirect("/home");
                }).catch((error) => {
                    devErrors.throw.db(error);
                    res.redirect(`/read/${answer.post}`);
                });
            } else {
                req.flash("error_msg", "You cannot delete this answer, because you aren't its author.");
                res.redirect(`/read/${answer.post}`);
            }
        } else {
            req.flash("error_msg", "Answer not found.");
            res.redirect("/home");
        }
    }).catch((error) => {
        devErrors.throw.db(error);
        res.redirect("/home");
    });
});

app.get("/error", (req, res) => {
    res.render("index/error");
});

app.use("/admin", admin);
app.use("/categories", categories);
app.use("/users", users);

// Server
app.listen(port, () => {
    console.log("--------------------");
    console.log("");
    port !== 80 ? console.log(`Server online at http://localhost:${port}/`) : console.log(`Server online at http://localhost/`);
    console.log(`Connection moment: ${new Date()}`);
});