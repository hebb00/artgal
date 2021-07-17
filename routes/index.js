var express = require("express");
var router = express.Router();
var bcrypt = require("bcrypt");
var database = require("./database");
var formidable = require("formidable");

var fs = require("fs");
const path = require("path");

/* GET home page. */
router.get("/", async function (req, res, next) {
  searchPics = req.flash("val");

  if (searchPics.length != 0) {
    console.log(searchPics);
    pics = await searching(searchPics);
  } else {
    query = `SELECT id, name, type, path FROM images`;
    try {
      var { rows } = await database.query(query);
    } catch (error) {
      console.log(error);
    }
    console.log(rows);
    pics = rows;
  }

  res.render("index", { title: "home", pics: pics });
});


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

router.get("/form", function (req, res, next) {
  if (!req.session.user) {
    res.redirect("/login");
  }

  res.render("form", { title: "bysell" });
});

router.post("/form", function (req, res, next) {
  form = new formidable.IncomingForm();
  form.parse(req, async function (err, fields, files) {
    picName = files.image.name;
    console.log(picName);
    oldPath = files.image.path;
    console.log(oldPath);

    // const file = fs.readFileSync(oldpath);
    newPath = "/home/heba/Desktop/myapp/artgal/public/images/pics/" + picName;
    fs.rename(oldPath, newPath, function (err) {
      if (err) throw err;
});
    imgPath = "images/pics/" + picName;

    q = `INSERT INTO images (name, type, description, path, artist)
        VALUES($1, $2, $3, $4, $5)`;
    try {
      await database.query(q, [
        fields.picName,
        fields.type,
        fields.description,
        imgPath,
        req.session.user.id,
      ]);
    } catch (error) {
      console.log(error);
    }
    res.redirect("/");
  });
});
module.exports = router;
