var express = require("express");
var router = express.Router();
var bcrypt = require("bcrypt");
var database = require("./database");
var formidable = require("formidable");

var fs = require("fs");

/* GET home page. */
router.get("/", async function (req, res) {
  query = `SELECT id, name, type, path FROM images`;
  try {
    var { rows } = await database.query(query);
  } catch (error) {
    console.log(error);
  }
  console.log(rows);

  res.render("index", { title: "explore", pics: rows });
});

router.get("/search", async function (req, res) {
  searchPics = req.flash("val");
  if (searchPics.length != 0) {
    console.log(searchPics);
    pics = await searching(searchPics);
  }

  res.render("search", { title: "search", pics: pics });
});

async function searching(type) {
  myquery = `SELECT images.id as id, images.path as path, images.name as name, users.name  FROM images JOIN users ON images.user_id = users.id WHERE
           (type LIKE '%${type}%' OR images.name LIKE '%${type}%' OR description LIKE '% ${type}%' OR
             users.name LIKE '%${type}%')`;
  rows = [];
  try {
    var { rows } = await database.query(myquery);
    var myPic = rows;
  } catch (error) {
    console.log(error);
  }
  return myPic;
}

router.post("/search", function (req, res) {
  console.log("post method search", req.body.searchValue);
  req.flash("val", req.body.searchValue);
  res.redirect("/search");
});

router.get("/signup", function (req, res) {
  res.render("signup", { title: "signup" });
});

router.post("/signup", async function (req, res) {
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
router.get("/login", function (req, res) {
  invalid = req.query.invalid;

  if (invalid) {
    var msg = "invalid email or password";
  }
  res.render("login", { title: "login", msg: msg });
});
router.post("/login", async function (req, res) {
  const check = req.body.check;
  data = await logIn(req.body);
  req.session.user = data;

  if (data) {
    if (check) {
      res.cookie("user", req.session.user);
    }
  } else {
    res.redirect("/login?invalid=1");
  }
  res.redirect("/profile");
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
router.get("/profile", async function (req, res) {
  user = req.session.user;
  console.log("profile", user);
  query = `SELECT id, name, type, path FROM images WHERE user_id = ${user.id}`;
  try {
    var { rows } = await database.query(query);
  } catch (error) {
    console.log(error);
  }
  console.log(rows);
  res.render("profile", {
    title: "profile",
    user: user,
    pics: rows,
  });
});

router.get("/image/:id", async function (req, res) {
  var id = req.params.id;
  console.log("its the pic params", req);
  pic = `SELECT images.id, images.name, type, path, user_id, users.name as artistName, users.id as userid FROM images join users ON
       users.id = images.user_id WHERE images.id = '${id}'`;
  rows = [];
  try {
    var { rows } = await database.query(pic);
  } catch (error) {
    console.log(error);
  }
  console.log(rows);
  if (req.session.user) {
    userid = req.session.user.id;
  } else {
    userid = null;
  }
  res.render("image", {
    title: "image",
    photo: rows,
    userid: userid,
  });
});

router.get("/logout", function (req, res) {
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

  res.render("form", { title: "upload" });
});

router.post("/form", function (req, res, next) {
  form = new formidable.IncomingForm();
  form.parse(req, async function (err, fields, files) {
    picName = files.image.name;
    console.log(picName);
    oldPath = files.image.path;
    console.log(oldPath);
    console.log(req.session.user.id, "digital user");
    newPath = "/home/heba/Desktop/myapp/artgal/public/images/pics/" + picName;
    fs.rename(oldPath, newPath, function (err) {
      if (err) throw err;
    });
    imgPath = "images/pics/" + picName;
    console.log("new type selection", fields.type);

    q = `INSERT INTO images (name, type, description, path, user_id)
        VALUES($1, $2, $3, $4, $5)`;
    try {
      await database.query(q, [
        fields.picName,
        fields.type,
        fields.description,
        imgPath,
        req.session.user.id,
      ]);
      info = `SELECT * FROM images WHERE name = '${fields.picName}' AND
           user_id = '${req.session.user.id}'`;
      rows = [];
      try {
        var { rows } = await database.query(info);
        var picid = rows[0].id;
        console.log(picid);
      } catch (error) {
        console.log(error);
      }
    } catch (error) {
      console.log(error);
    }
    res.redirect("/image/" + picid);
  });
});
router.post("/delete/:id", async function (req, res) {
  var id = req.params.id;
  console.log(id, "deleted pic id");
  remove = `DELETE FROM images WHERE id = ${id} `;
  try {
    await database.query(remove);
  } catch (error) {
    console.log(error);
  }
  res.redirect("/profile");
});

router.get("/edit/:id", async function (req, res) {
  var id = req.params.id;
  query = `SELECT id, name, type, path, description FROM images WHERE id = '${id}'`;
  try {
    var { rows } = await database.query(query);
  } catch (error) {
    console.log(error);
  }
  console.log(rows, "look for description");

  res.render("edit", { title: "edit", img: rows, id: id });
});

router.post("/edit/:id", async function (req, res) {
  var id = req.params.id;
  console.log(id, "edit id");
  var form = new formidable.IncomingForm();
  form.parse(req, async function (err, fields, files) {
    var newName = fields.picName;
    var newType = fields.type;
    var newDescription = fields.description;
    console.log(newName, "my new name is");
    update = `UPDATE images SET name = '${newName}', type = '${newType}',
    description = '${newDescription}' WHERE id = ${id} `;
    try {
      await database.query(update);
    } catch (error) {
      console.log(error);
    }
    res.redirect("/image/" + id);
  });
});

module.exports = router;
