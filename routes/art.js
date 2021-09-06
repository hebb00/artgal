var express = require("express");
var router = express.Router();

/* GET users listing. */
// router.get("/", function (req, res, next) {
//   res.send("respond with a resource");
// });

router.get("/", function (req, res, next) {
  if (req.session.user) {
    res.locals.user = req.session.user;
  } else {
    res.locals.user = null;
  }
  res.render("articles", { title: "articles" });
});

router.get("/form", check, function (req, res, next) {
  res.render("art-form", { title: "form" });
});
router.post("/form", async function (req, res, next) {});

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
module.exports = router;
