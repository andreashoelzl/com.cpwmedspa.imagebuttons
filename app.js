import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import dotenv from 'dotenv';
import session from 'express-session';

import indexRouter from './routes/index.js';
import usersRouter from './routes/users.js';

dotenv.config();

const app = express();

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));

// view engine setup
app.set('views', path.join(path.dirname(''), 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(path.dirname(''), 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.get('/captcha', (req, res) => {
  const captcha = svgCaptcha.create();
  req.session.captchaText = captcha.text;
  res.render('form', { captcha: captcha.data });
});

app.post('/verify', (req, res) => {
  if (req.body.captcha === req.session.captchaText) {
      res.send('Valid captcha');
  } else {
      res.send('Invalid captcha');
  }
});

export default app;