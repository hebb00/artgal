var express = require("express");
var router = express.Router();
var database = require("./database");
var formidable = require("formidable");
var fs = require("fs");
const { time } = require("console");
const dayjs = require("dayjs");
var querystring = require("querystring");

router.get("/profile", async function (req, res, next) {
  if (res.locals.user) {
    user = res.locals.user;
  } else {
    user = null;
  }
  query = `SELECT id, name, type, path
    FROM images WHERE user_id =' ${user.id}'`;
  try {
    var { rows } = await database.query(query);
  } catch (error) {
    console.log(error);
  }
  console.log("user in profile ", user);

  var likes = `SELECT COUNT(likes.img_id) AS like_num, images.id FROM likes JOIN images ON
    likes.img_id = images.id GROUP BY images.id`;
  try {
    const { rows } = await database.query(likes);
    var like = rows;
  } catch (error) {
    console.log(error);
  }
  console.log(like, "likes");
  res.render("profile", {
    title: "profile",
    pics: rows,
    like: like,
  });
});

router.get("/form", function (req, res, next) {
  res.render("form", { title: "upload" });
});

router.post("/form", function (req, res, next) {
  const user = res.locals.user;
  form = new formidable.IncomingForm();
  form.parse(req, async function (err, fields, files) {
    var picName = files.image.name;
    var oldPath = files.image.path;
    var newPath =
      "/home/heba/Desktop/myapp/artgal/public/images/pics/" + picName;
    fs.rename(oldPath, newPath, function (err) {
      if (err) throw err;
    });
    var imgPath = "images/pics/" + picName;

    q = `INSERT INTO images (name, type, description, path, user_id)
        VALUES($1, $2, $3, $4, $5)`;
    try {
      await database.query(q, [
        fields.picName,
        fields.type,
        fields.description,
        imgPath,
        user.id,
      ]);
      info = `SELECT * FROM images WHERE name = '${fields.picName}' AND
           user_id = '${user.id}'`;
      rows = [];
      try {
        var { rows } = await database.query(info);
        var picid = rows[0].id;
      } catch (error) {
        console.log(error);
      }
    } catch (error) {
      console.log(error);
    }
    res.redirect("/image/" + picid);
  });
});

router.post("/profilePic/:id", function (req, res, next) {
  const userid = req.session.user.id;
  var form = new formidable.IncomingForm();
  form.parse(req, async function (err, fields, files) {
    var picName = files.image.name;
    var oldPath = files.image.path;
    var newPath =
      "/home/heba/Desktop/myapp/artgal/public/images/pics/" + picName;
    fs.rename(oldPath, newPath, function (err) {
      if (err) throw err;
    });
    var imgPath = "images/pics/" + picName;
    var newQ = `UPDATE users SET profile_pic = '${imgPath}' WHERE id = ${userid} `;
    try {
      await database.query(newQ);
    } catch (error) {
      console.log(error);
    }
    res.redirect("/users/profile");
  });
});
router.get("/profilePic/:id", async function (req, res, next) {
  var id = req.params.id;
  res.render("profilePic", { title: "profile_pic", id: id });
});
router.get("/edit/:id", async function (req, res) {
  var id = req.params.id;
  query = `SELECT id, name, type, path, description FROM images WHERE id = '${id}'`;
  try {
    var { rows } = await database.query(query);
  } catch (error) {
    console.log(error);
  }

  res.render("edit", { title: "edit", img: rows, id: id });
});

router.post("/edit/:id", async function (req, res) {
  var id = req.params.id;
  var form = new formidable.IncomingForm();
  form.parse(req, async function (err, fields, files) {
    var newName = fields.picName;
    var newType = fields.type;
    var newDescription = fields.description;
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
async function newComment(comment, id, res) {
  var cmntQuery = `INSERT INTO comments(time, img_art_id, comment,user_id)
    VALUES($1, $2, $3, $4)`;
  try {
    await database.query(cmntQuery, [
      dayjs().format(),
      id,
      comment,
      res.locals.user.id,
    ]);
  } catch (error) {
    console.log(error);
  }
}
router.post("/comment/:id", function (req, res) {
  var comment = req.body.comment;
  var name = req.body.username;
  console.log(req.body);
  var id = req.params.id;
  newComment(comment, id, res);
  console.log(req.query.articles, "true or false");
  res.redirect(`/art/articles/article/${id}?comment=${comment}&name=${name}`);
});

router.post("/imgcomment/:id", async function (req, res) {
  var comment = req.body.comment;
  var name = req.body.username;
  var id = req.params.id;
  newComment(comment, id, res);
  res.redirect(`/image/${id}`);
});

module.exports = router;
