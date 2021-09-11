var express = require("express");
var router = express.Router();
var database = require("./database");
var formidable = require("formidable");
var fs = require("fs");

/* GET users listing. */
// router.get("/", function (req, res, next) {
//   res.send("respond with a resource");
// });
async function check(req, res, next) {
  if (!req.session.user && req.cookies.user) {
    req.session.user = req.cookies.user;
  }
  if (req.session.user) {
    var user = req.session.user;
    var userQuery = `SELECT id, name, profile_pic FROM users WHERE id = ${user.id}`;
    try {
      var { rows, rowCount } = await database.query(userQuery);
    } catch (error) {
      console.log(error);
    }
    if (rowCount > 0) {
      res.locals = {
        user: rows[0],
      };
      console.log("user in check", res.locals.user);
      return next();
    }
  }
  res.redirect("/login");
}

router.get("/", async function (req, res, next) {
  if (req.session.user) {
    res.locals.user = req.session.user;
  } else {
    res.locals.user = null;
  }
  var data = `SELECT * FROM articles `;
  try {
    var { rows } = await database.query(data);
  } catch (error) {
    console.log(error);
  }

  res.render("articles", { title: "articles", articles: rows });
});

router.get("/form", check, function (req, res, next) {
  res.render("art-form", { title: "form" });
});
router.post("/form", check, async function (req, res, next) {
  var form = new formidable.IncomingForm();
  form.parse(req, async function (err, fields, files) {
    var title = fields.title;
    var article = fields.article;
    var query = `INSERT INTO articles (title,article,user_id )
          VALUES($1, $2, $3)`;
    try {
      await database.query(query, [title, article, res.locals.user.id]);
    } catch (error) {
      console.log(error);
    }
  });
  res.redirect("/art/");
});

router.get("/details/:id", async function (req, res, next) {
  var id = req.params.id;
  var get = ` SELECT * FROM articles WHERE art_id = ${id}`;
  try {
    var { rows } = await database.query(get);
  } catch (error) {
    console.log(error);
  }
  console.log("details", rows);
  if (req.session.user) {
    var user = req.session.user;
  } else {
    user = null;
  }
  res.render("details", { title: "details", article: rows[0], user: user });
});
router.post("/article/:id", async function (req, res, next) {
  var id = req.params.id;
  var del = `DELETE FROM articles WHERE art_id = ${id}`;
  try {
    await database.query(del);
  } catch (error) {
    console.log(error);
  }
  console.log("deleted");
  res.redirect("/art/");
});

router.post("/modify/:id", async function (req, res, next) {
  var id = req.params.id;
  var form = new formidable.IncomingForm();
  form.parse(req, async function (err, fields, files) {
    var title = fields.title;
    var article = fields.article;
    var update = `UPDATE articles SET title = '${title}',
     article = '${article}' WHERE art_id = ${id} `;
    try {
      await database.query(update);
    } catch (error) {
      console.log(error);
    }
    console.log("deleted");
    res.redirect("/art/");
  });
});

router.get("/modify/:id", check, async function (req, res, next) {
  var id = req.params.id;
  query = `SELECT art_id, title, article FROM articles WHERE art_id = '${id}'`;
  try {
    var { rows } = await database.query(query);
  } catch (error) {
    console.log(error);
  }

  console.log("modify", rows);
  res.render("modify", { title: "modify", article: rows[0] });
});

module.exports = router;
