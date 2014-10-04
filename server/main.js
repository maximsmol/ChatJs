'use strict';

//Libraries
var express = require('express');
var createHttpServer = require('http').Server;

//Express midleware
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var morgan = require('morgan');
var errorhandler = require('errorhandler');
var compressor = require('compression');

//My
var serverUtil = require('./util');
var DbHandler = require('./dbHandler');
var socketHandler = require('./socketHandler.js');
var Room = require('./room.js');

//Globals
var app = null;
var server = null;
var dbHandler = null;

//-----------------------------------------------------------------------------

//Checks if an error occured and redirects to /internalError
var dieIfInternalError = function(err, res)
{
	if (err != null)
	{
		if (serverUtil.debug) console.log('DiedOnInternalError:',err);
		res.redirect('/internalError');
		return true;
	}
	return false;
};

//Checks if user is logged in, if not redirects to /login and return false
var checkLogin = function(req, res)
{
	if (req.session.user == null)
	{
		res.redirect('/login');
		return false;
	}
	return true;
};

//Tries to login user, if fails redirects to /login
var tryLogin = function(req, res, username, password, callback)
{
	dbHandler.getUser(username, function(err, user)
	{
		if (dieIfInternalError(err, res)) return;
		if (!user)
		{
			callback('User doesn\'t exist');
			return;
		}
		DbHandler.verifyPassword(user, password, function(err, equal)
		{
			if (!equal)
			{
				callback('Password is invalid');
				return;
			}

			req.session.regenerate(function(err)
			{
				if (dieIfInternalError(err, res)) return;

				req.session.user = user;
				callback(null);
				return;
			});
		});
	});
};

//-----------------------------------------------------------------------------

//Setup db
dbHandler = new DbHandler(27017, function()
{

//-----------------------------------------------------------------------------

//Setup server
app = express();
server = createHttpServer(app);

//Connect io to server
socketHandler.init(dbHandler, server);

//-----------------------------------------------------------------------------

//Set default view engine to jade
app.set('view engine', 'jade');

//-----------------------------------------------------------------------------

//Handle errors
if (serverUtil.debug) app.use(errorhandler());
//Log
app.use(morgan('dev'));
//Compressor
app.use(compressor({threshold: 512}));

//Try serve resources
app.use(express.static('./bower_components/'));
app.use(express.static('./public/'));

//Parse cookies for session
app.use(cookieParser(serverUtil.secret));
//Parse session cookie
app.use(session(
			{
				store: dbHandler.sessionsStore,
				resave: true,
				saveUninitialized: true,
				secret: serverUtil.secret,
				cookie: {path: '/', httpOnly: false,
						 secure: false, maxAge: null}
			}
		));
//Finally, parse the body
app.use(bodyParser.urlencoded({extended: true}));

//-----------------------------------------------------------------------------

app.get('/', function(req, res)
{
	if (!checkLogin(req, res)) return;
	res.render('index', {});
});

//-----------------------------------------------------------------------------

app.get('/login', function(req, res)
{
	res.render('login', {});
});

app.post('/login', function(req, res)
{
	tryLogin(req, res,
			 req.body.username, req.body.password,
	function(err)
	{
		if (err === 'User doesn\'t exist')
		{
			res.redirect('/register');
			return;
		}
		else if (err === 'Password is invalid')
		{
			res.redirect('/login');
			return;
		}
		else if (dieIfInternalError(err, res)) return;
		res.redirect('/');
	});
});

//-----------------------------------------------------------------------------

app.get('/register', function(req, res)
{
	res.render('register', {});
});

app.post('/register', function(req, res)
{
	dbHandler.register(req.body.username, req.body.password,
	function(err)
	{
		if (err === 'User already exists')
		{
			res.redirect('/register');
			return;
		}
		else if (dieIfInternalError(err, res)) return;

		tryLogin(req, res,
				 req.body.username, req.body.password,
		function(err)
		{
			//User SHOULD exist, password SHOULD be right
			if (dieIfInternalError(err, res)) return;
			res.redirect('/');
		});
	});
});

//-----------------------------------------------------------------------------

app.get('/logout', function(req, res)
{
	req.session.destroy(function(err)
	{
		if(dieIfInternalError(err, res)) return;
		res.redirect('/');
	});
});

//-----------------------------------------------------------------------------

app.get('/room/:id', function(req, res)
{
	if (!checkLogin(req, res)) return;

	var roomId = req.params.id;
	dbHandler.getRoom(roomId, function(err, room)
	{
		if (dieIfInternalError(err, res)) return;
		if (room == null)
		{
			room = new Room();
			room.init(dbHandler, roomId, function (err)
			{
				if (dieIfInternalError(err, res)) return;
				dbHandler.addRoom(room, function(err)
				{
					if (dieIfInternalError(err, res)) return;
					
					res.cookie('roomId', roomId);
					res.render('room', {roomId: roomId});
				});
			});
		}
		else
		{
			res.cookie('roomId', roomId);
			res.render('room', {roomId: roomId});
		}
	});
});

//-----------------------------------------------------------------------------

server.listen(25565, function()
{
	console.log('Server ready');
});

});