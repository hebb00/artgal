var express = require("express");
var router = express.Router();
var database = require("./database");
var formidable = require("formidable");
var fs = require("fs");
const { time } = require("console");
const dayjs = require("dayjs");
var customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);
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

router.get("/articles", async function (req, res, next) {
  if (req.session.user) {
    res.locals.user = req.session.user;
  } else {
    res.locals.user = null;
  }
  var data = `SELECT *,users.name FROM articles JOIN users ON
     users.id = articles.user_id LIMIT 8 `;
  try {
    var { rows } = await database.query(data);
    var dayFormat = [];
    for (var i = 0; i < rows.length; i++) {
      dayFormat[i] = dayjs(rows[i].date).format("DD/MM/YYYY");
      rows[i].date = dayFormat[i];
    }
  } catch (error) {
    console.log(error);
  }
  //   The JavaScript specification gives exactly one proper way to determine the class of an object:

  // Object.prototype.toString.call(t);
  //   console.log(" date", Object.prototype.toString.call(rows[0].date));
  let count = `SELECT COUNT(c_id) AS c_num, img_art_id FROM comments JOIN articles 
    ON comments.img_art_id = articles.art_id 
     GROUP BY img_art_id`;
  try {
    let { rows } = await database.query(count);
    var numOfcomnt = rows;
  } catch (error) {
    console.log(error);
  }
  console.log(numOfcomnt, "num of comnt");
  console.log(dayjs(rows[0].date).format("DD/MM/YYYY"));
  res.render("articles", {
    title: "articles",
    articles: rows,
    num: numOfcomnt,
  });
});

router.get("/article/form", check, function (req, res, next) {
  res.render("articles-form", { title: "form" });
});
router.post("/article/form", check, async function (req, res, next) {
  var form = new formidable.IncomingForm();
  form.parse(req, async function (err, fields, files) {
    var title = fields.title;
    var article = fields.article;
    var query = `INSERT INTO articles (title, article, user_id, date )
          VALUES($1, $2, $3, $4)`;
    try {
      await database.query(query, [
        title,
        article,
        res.locals.user.id,
        dayjs().format(),
      ]);
    } catch (error) {
      console.log(error);
    }
  });
  res.redirect("/art/articles");
});

router.get("/articles/:id", async function (req, res, next) {
  var id = req.params.id;

  var get = ` SELECT * FROM articles WHERE art_id = ${id}`;
  try {
    var { rows } = await database.query(get);
  } catch (error) {
    console.log(error);
  }
  console.log("article", rows);
  if (req.session.user) {
    var user = req.session.user;
  } else {
    user = null;
  }
  var qq = `SELECT *,name FROM comments JOIN users ON users.id = comments.user_id
     WHERE img_art_id = ${id} ORDER BY c_id  LIMIT 5`;
  try {
    const { rows, rowCount } = await database.query(qq);
    var comnt = rows;
    var Count = rowCount;
    var time = [];
    for (var i = 0; i < Count; i++) {
      time[i] = dayjs(comnt[i].time).format("DD/MM/YYYY");
    }
  } catch (error) {
    console.log(error);
  }
  res.render("article", {
    title: "article",
    article: rows[0],
    articles: rows[0].art_id,
    user: user,
    cmnt: comnt,
    time: time,
    rowCount: Count,
  });
});
router.post("/articles/delete/article/:id", async function (req, res, next) {
  var id = req.params.id;
  var del = `DELETE FROM articles WHERE art_id = ${id}`;
  try {
    await database.query(del);
  } catch (error) {
    console.log(error);
  }
  console.log("deleted");
  res.redirect("/art/articles");
});

router.post("/article/modify/:id", async function (req, res, next) {
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
    res.redirect("/articles");
  });
});

router.get("/article/modify/:id", check, async function (req, res, next) {
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
