var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {title: 'CPW Vein & Aesthetic Center' });
});
router.get('/visitedpages', function(req, res, next) {
  res.render('visitedpages', {title: 'Visited Pages' });
})
module.exports = router;
