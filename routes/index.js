var express = require("express");
var router = express.Router();
var bcrypt = require("bcrypt");
var database = require("./database");
var formidable = require("formidable");
var fs = require("fs");
const { time } = require("console");
const dayjs = require("dayjs");
// const { delete } = require("../app");

router.get("/", async function (req, res) {
  query = `SELECT id, name, type, path FROM images`;
  try {
    var { rows } = await database.query(query);
  } catch (error) {
    console.log(error);
  }
  if (req.session.user) {
    res.locals.user = req.session.user;
    var tes = [];
    for (var i = 0; i < 8; i++) {
      var test = ` SELECT * FROM likes WHERE img_id = ${rows[i].id} AND user_id = ${res.locals.user.id}`;
      try {
        let { rowCount } = await database.query(test);
        tes[i] = rowCount;
      } catch (error) {
        console.log(error);
      }

      console.log(tes, "testing tes in home");
    }
  } else {
    res.locals.user = null;
  }
  var likes = `SELECT COUNT(likes.img_id) AS like_num, images.id FROM likes JOIN images ON
    likes.img_id = images.id GROUP BY images.id`;
  try {
    const { rows } = await database.query(likes);
    var like = rows;
  } catch (error) {
    console.log(error);
  }
  var likesNum = [];
  for (i = 0; i < 8; i++) {
    for (var j = 0; j < like.length; j++) {
      if (rows[i].id == like[j].id) {
        likesNum[i] = like[j].like_num;
        console.log(likesNum, "likes num");
      }
    }
  }

  res.render("index", {
    title: "explore",
    pics: rows,
    like: likesNum,
    test: tes,
  });
});

router.get("/search", async function (req, res) {
  var searchPics = req.query.searchValue;
  var choose = req.query.choose;
  var pics = "";
  if (searchPics) {
    pics = await searching(searchPics, choose);
  }
  if (req.session.user) {
    res.locals.user = req.session.user;
    if (pics) {
      var tes = [];
      for (let i = 0; i < pics.length; i++) {
        let test = ` SELECT * FROM likes WHERE img_id = ${pics[i].id} AND user_id = ${res.locals.user.id}`;
        try {
          let { rowCount } = await database.query(test);
          tes[i] = rowCount;
        } catch (error) {
          console.log(error);
        }
      }

      var likes = `SELECT COUNT(likes.img_id) AS like_num, images.id FROM likes JOIN images ON
     likes.img_id = images.id GROUP BY images.id `;
      try {
        const { rows } = await database.query(likes);
        var like = rows;
      } catch (error) {
        console.log(error);
      }

      var likesNum = [];
      for (i = 0; i < pics.length; i++) {
        for (var j = 0; j < like.length; j++) {
          if (pics[i].id == like[j].id) {
            likesNum[i] = like[j].like_num;
          }
        }
      }
      console.log(likesNum, "likes num");

      console.log(tes, "testing tes in home");
    }
  } else {
    res.locals.user = null;
  }

  console.log("search get", pics);
  res.render("search", {
    title: "search",
    pics: pics,
    test: tes,
    like: likesNum,
  });
});

async function searching(type, select) {
  console.log("inside search function", select);
  if (select === "img") {
    myquery = `SELECT images.id as id, images.path as path, images.name as name, users.name  
      FROM images JOIN users ON images.user_id = users.id WHERE
      type LIKE '%${type}%' OR images.name LIKE '%${type}%' OR description LIKE '% ${type}%' OR
      users.name LIKE '%${type}%' LIMIT 8`;
  } else {
    myquery = `SELECT art_id , title , article FROM articles WHERE title LIKE '%${type}%' OR article LIKE '%${type}%' LIMIT 8`;
  }

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
  res.redirect(
    `/search?choose=${req.body.choose}&searchValue=${req.body.searchValue}`
  );
});

router.get("/signup", function (req, res, next) {
  res.render("signup", { title: "signup" });
});

router.post("/signup", async function (req, res, next) {
  var name = req.body.user;
  var email = req.body.email;
  var password = req.body.pass;
  var profile_pic = "images/pics/hiphop.jpeg";
  const hashedPass = bcrypt.hashSync(password, 10);

  query = `INSERT INTO users(name, email, password, profile_pic)
          VALUES('${name}', '${email}', '${hashedPass}', '${profile_pic}')`;

  try {
    await database.query(query);
    result = await logIn(req.body);
    req.session.user = result;
  } catch (error) {
    console.log(error);
  }

  res.redirect("/users/profile");
});
router.get("/login", function (req, res, next) {
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
  res.redirect("/users/profile");
});
async function logIn(body) {
  var userName = body.user;
  q = `SELECT id, name, password, profile_pic FROM users WHERE name = '${userName}'`;
  rows = [];
  try {
    var { rows, rowCount } = await database.query(q);

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

router.get("/logout", function (req, res) {
  req.session.destroy(function () {});
  res.clearCookie("user");
  console.log(res.locals.user);

  res.locals.user = null;
  console.log(res.locals.user);
  res.redirect("/login");
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
    res.locals.user = req.session.user;
  } else {
    res.locals.user = null;
  }

  res.render("image", {
    title: "image",
    photo: rows,
  });
});

router.post("/delete/:id", async function (req, res) {
  var id = req.params.id;
  remove = `DELETE FROM images WHERE id = ${id} `;
  try {
    await database.query(remove);
  } catch (error) {
    console.log(error);
  }
  res.redirect("/users/profile");
});

router.get("/like/:id", async function (req, res) {
  if (req.session.user) {
    res.locals.user = req.session.user;
  } else {
    res.locals.user = null;
    res.redirect("/login");
    return;
  }
  var id = req.params.id;
  console.log(id);
  console.log(res.locals.user);
  var test = ` SELECT * FROM likes WHERE img_id = ${id} AND user_id = ${res.locals.user.id}`;
  try {
    let { rowCount } = await database.query(test);
    var tes = rowCount;
  } catch (error) {
    console.log(error);
  }
  if (tes == 0) {
    var into = `INSERT INTO likes(user_id, img_id, art_id)
    VALUES(${res.locals.user.id}, ${id}, NULL)`;
    try {
      await database.query(into);
    } catch (error) {
      console.log(error);
    }
  }

  var text = `SELECT COUNT(img_id) AS likes_num FROM likes WHERE img_id = ${id}`;
  try {
    let { rows } = await database.query(text);
    var num = rows;
  } catch (error) {
    console.log(error);
  }
  var likes = num[0].likes_num;
  console.log(likes);
  res.send("" + likes);
});

router.get("/unlike/:id", async function (req, res) {
  var id = req.params.id;
  if (req.session.user) {
    res.locals.user = req.session.user;
  } else {
    res.locals.user = null;
    res.redirect("/login");
    return;
  }
  var del = `DELETE FROM likes WHERE img_id = ${id} AND user_id = ${res.locals.user.id}`;
  try {
    await database.query(del);
  } catch (error) {
    console.log(error);
  }

  let text = `SELECT COUNT(img_id) AS likes_num FROM likes WHERE img_id = ${id}`;
  try {
    let { rows } = await database.query(text);
    var numb = rows;
  } catch (error) {
    console.log(error);
  }
  let likes = numb[0].likes_num;
  console.log(likes);
  res.send("" + likes);
});

module.exports = router;
