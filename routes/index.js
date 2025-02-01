var express = require('express');
var router = express.Router();

var fs = require('node:fs');
var pages = JSON.parse(fs.readFileSync('./public/javascripts/pages.json', 'utf8'));
var buttons = JSON.parse(fs.readFileSync('./public/javascripts/buttons.json', 'utf8'));
 
pages.forEach((page, index) => pages[index] = (page.indexOf('/') > -1)? page.split('/').pop(): "");
buttons.forEach((button, index) => buttons[index] = button.split('/').pop());

buttons.push('');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {title: 'Welcome' });
});
router.get('/visitedpages', function(req, res, next) {
  res.render('visitedpages', {title: 'Pages', anchors:pages});
});
router.get('/buttons', function(req, res, next) {
  res.render('buttons', {title: 'Buttons', anchors:buttons});
});
router.get('/errors', function(req, res, next) {
  res.render('errors', {title: 'Errors'});
});
module.exports = router;