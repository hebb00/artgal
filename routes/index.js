var express = require('express');
var router = express.Router();
var database = require("./database");
var formidable = require("formidable");

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'page title' });
});

module.exports = router;
