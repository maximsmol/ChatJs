'use strict';

//Libraries
var express = require('express');
var createHttpServer = require('http').Server;

//Express midleware
var bodyParser = require('body-parser'); //Parse forms
var cookieParser = require('cookie-parser'); //Required for expression-session
var session = require('express-session'); //Authorization
var morgan = require('morgan'); //Logs all requests
var errorhandler = require('errorhandler'); //Redirect to error page on unhandled errors
var compressor = require('compression'); //Compress large files

//My
var serverUtil = require('./util'); //Constants
var DbHandler = require('./dbHandler'); //Database handler
var socketHandler = require('./socketHandler.js'); //Socket.io connection handler
var Room = require('./room.js'); //Chat room class

//Globals
var app = null; //Express app
var server = null; //Express app as connect server
				   //Required for socket.io
var dbHandler = null; //DbHandler global instance

//-----------------------------------------------------------------------------

//Checks if an error occured and redirects to /internalError
var dieIfInternalError = function(err, res, callback)
{
	if (err != null)
	{ //There is an error
		if (serverUtil.debugMode) console.log('DiedOnInternalError:', err);
		res.redirect('/internalError');
		return;
	}
	callback();
};

//Checks if user is logged in, if not redirects to /login
var checkLogin = function(req, res, callback)
{
	if (req.session.user == null)
	{ //Parsed session doesn't contain a serialized user
		res.redirect('/login');
		return;
	}
	callback();
};

//Tries to login user, if fails redirects to /login
var tryLogin = function(req, res, username, password, callback)
{
	if (req.session.user != null)
	{ //Nothing to do
		callback(null);
		return;
	}

	//Try to get user
	dbHandler.getUser(username, function(err, user)
	{
		dieIfInternalError(err, res,
		function()
		{ //No error occured
			if (!user)
			{ //No such user found
				callback('User doesn\'t exist');
				return;
			}
			//User is found

			//Verify password
			DbHandler.verifyPassword(user, password, function(err, equal)
			{
				dieIfInternalError(err, res,
				function()
				{ //No error occured
					if (!equal)
					{ //Password hashes are not equal
						callback('Password is invalid');
						return;
					}

					//Password is valid
					req.session.regenerate(function(err)
					{ //Login user to express-session
						dieIfInternalError(err, res,
						function()
						{	
							req.session.user = user; //Set session's user
							callback(null);
							return;
						});
					});
				});
			});
		});
	});
};

//-----------------------------------------------------------------------------

//Connect to database
dbHandler = new DbHandler(serverUtil.dbPort,
function()
{ //At this point database has successfully setup
  //Otherwise DbHandler has already thrown an error

//-----------------------------------------------------------------------------

//Setup server
app = express();
server = createHttpServer(app);

//Connect socket.io with express server
socketHandler.init(dbHandler, server);

//-----------------------------------------------------------------------------

//Render views with jade
app.set('view engine', 'jade');

//-----------------------------------------------------------------------------

//Log request
app.use(morgan('dev'));
//Handle errors
if (serverUtil.debugMode) app.use(errorhandler());
//Compress any large files
app.use(compressor({threshold: 512}));

//Serve resources
app.use(express.static('./bower_components/'));
app.use(express.static('./public/'));

//Parse the body
app.use(bodyParser.urlencoded({extended: true}));
//Parse cookies for session
app.use(cookieParser(serverUtil.secret));
//Parse session
app.use(session(
				{
					store: dbHandler.sessionsStore,
					resave: true,
					saveUninitialized: true,
					secret: serverUtil.secret,
					cookie: {path: '/', httpOnly: false,
						 	 secure: false, maxAge: null}
				}));

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