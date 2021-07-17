var express = require('express');
var router = express.Router();
var database = require("./database");
var formidable = require("formidable");

/* GET home page. */

router.get("/signup", function (req, res, next) {
  res.render("signup", { title: "signup" });
});

router.post("/signup", async function (req, res, next) {
  var name = req.body.user;
  var email = req.body.email;
  var password = req.body.pass;
  console.log(password);
  const hashedPass = bcrypt.hashSync(password, 10);

  query = `INSERT INTO users(name, email, password)
          VALUES('${name}', '${email}', '${hashedPass}')`;

  try {
    await database.query(query);
    result = await logIn(req.body);
    req.session.user = result;
    console.log(req.session.user);
  } catch (error) {
    console.log(error);
  }

  res.redirect("/login");
});
router.get("/login", function (req, res, next) {
  res.render("login", { title: "login" });
});
router.post("/login", async function (req, res, next) {
  check = req.body.check;
  data = await logIn(req.body);
  req.session.user = data;
  console.log("session", req.session.user.name);

  if (data) {
    if (check) {
      res.cookie("user", req.session.user);
    }
    res.redirect("/profile");
  } else {
    res.redirect("/signup");
  }
});
async function logIn(body) {
  var email = body.email;
  q = `SELECT id, name, password FROM users WHERE email = '${email}'`;
  rows = [];
  try {
    var { rows, rowCount } = await database.query(q);
    console.log(rows);

    if (rowCount == 0) {
      return null;
    }

    var verified = bcrypt.compareSync(body.pass, rows[0]["password"]);
  } catch (error) {
    console.log(error);
  }
  if (verified) {
    return rows[0];
  } else {
    return null;
  }
}
router.get("/profile", function (req, res, next) {
  user = req.session.user;
  console.log("profile", user);
  res.render("profile", { title: "profile", user: user });
});

router.get("/logout", function (req, res, next) {
  req.session.destroy(function () {
    console.log("user logged out");
  });
  res.clearCookie("user");
  res.redirect("/login");

  res.render("logout", { title: "logout" });
});

});

module.exports = router;
