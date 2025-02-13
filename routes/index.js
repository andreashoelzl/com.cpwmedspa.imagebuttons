import express from 'express'; 
import svgCaptcha from 'svg-captcha';
import { startCrawl } from '../crawl.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path'; 

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

function loadFile(url) {
  try {
    return fs.readFileSync(path.join(__dirname, url), 'utf8');
  } catch (err) {
    console.error(err);
  }
}

const pages = JSON.parse(loadFile('../public/javascripts/pages.json'));
const buttons = JSON.parse(loadFile('../public/javascripts/buttons.json'));
const cpwmedspa = JSON.parse(loadFile('../public/javascripts/cpwmedspa.json'));

pages.forEach((page, index) => pages[index] = (page.indexOf('/') > -1) ? page.split('/').pop() : "");
buttons.forEach((button, index) => buttons[index] = button.split('/').pop());

buttons.push('');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Welcome', timestamp:cpwmedspa.timestamp });
});  
router.get('/visitedpages', function(req, res, next) {
  res.render('visitedpages', { title: 'Pages', anchors: pages, timestamp:cpwmedspa.timestamp });
});

router.get('/buttons', function(req, res, next) {
  res.render('buttons', { title: 'Buttons', anchors: buttons, timestamp:cpwmedspa.timestamp });
});  

router.get('/errors', function(req, res, next) {
  res.render('errors', { title: 'Errors' });
});

router.get('/update', function(req, res) {
  const captcha = svgCaptcha.create();
  req.session.captchaText = captcha.text;
  res.render('update', { captcha: captcha.data });
});  

router.post('/updating', async function(req, res) {
  if (req.body.captcha === req.session.captchaText) {
    try {
      await startCrawl();
      res.redirect('/updating');
    } catch (error) {
      res.status(500).render('error', { 
        message: 'Crawl failed',
        error: error 
      });  
    }  
  } else {
    res.render('update', { 
      error: 'Invalid captcha',
      captcha: svgCaptcha.create().data 
    });  
  }  
});  
/*

router.get('/update', function(req, res, next) {
  const captcha = svgCaptcha.create();
  req.session.captchaText = captcha.text;
  res.render('update', { title: 'Update', captcha: captcha.data });
});  

router.get('/updating', function(req, res, next) {
  res.render('updating', { title: 'Updating' });
});  

router.get('/update', function(req, res) {
  const captcha = svgCaptcha.create();
  req.session.captchaText = captcha.text;
  res.render('update', { captcha: captcha.data });
});

router.post('/updating', function(req, res) {
  if (req.body.captcha === req.session.captchaText) {
    // Start crawler process here
    res.redirect('/');
  } else {
    res.status(400).send('Invalid captcha');
  }
});

/*router.post('/update', (req, res) => {
  if (req.body.captcha === req.session.captchaText) {
    // Captcha valid
    res.send('Success!');
  } else {
    // Captcha invalid
    res.send('Failed!');
  }
});*/

export default router;