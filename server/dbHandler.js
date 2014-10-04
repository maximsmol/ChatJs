'use strict';

//Libraries
var session = require('express-session');

//Mongo
var MongoClient = require('mongodb').MongoClient;

//Mongo session storage
var connectMongo = require('connect-mongo');
var MongoStore = connectMongo(session);

//Crypt
var bcrypt = require('bcrypt');

/*
User:
	username: string
	password: bcrypt.hashSync(password, salt);
	salt    : bcrtpy.genSaltSync();
	socket  : null || socket.io socket;
*/

var DbHandler = function(port, callback)
{
	this.rooms = [];

	var self = this;
	MongoClient.connect('mongodb://localhost:'+port+'/chat', function(err, db)
	{
		if (err != null) throw new Error(err);

		self.db = db;
		self.sessionsStore = new MongoStore({db: self.db});
		db.collection('users', function(err, users)
		{
			if (err != null) throw new Error(err);

			self.users = users;
			callback();
		});
	});
};

DbHandler.prototype.register = function(username, password, callback)
{
	var self = this;
	this.users.findOne({username: username}, function(err, user)
	{
		if (err != null)
		{
			callback(err);
			return;
		}
		if (user != null)
		{
			callback('User already exists');
			return;
		}

		bcrypt.genSalt(function(err, salt)
		{
			if (err != null)
			{
				callback(err);
				return;
			}

			bcrypt.hash(password, salt, function(err, hash)
			{
				if (err != null)
				{
					callback(err);
					return;
				}
				self.users.insert({username: username,
								   password: hash,
								   salt    : salt,
								   socket  : null},
				function(err)
				{
					callback(err);
				});
			});
		});
	});
};

DbHandler.prototype.requestCollection = function(collectionName, callback)
{
	this.db.collection(collectionName, callback);
};

DbHandler.prototype.getUser = function(username, callback)
{
	this.users.findOne({username: username}, callback);
};


DbHandler.prototype.addRoom = function(room, callback)
{
	var r = this.rooms[room.roomId];
	if (r != null) callback('Room already exists');

	this.rooms[room.roomId] = room;
	callback(null);
};

DbHandler.prototype.getRoom = function(roomId, callback)
{
	var room = this.rooms[roomId];

	callback(null, room);
};


DbHandler.prototype.getSession = function(sessionId, callback)
{
	this.sessionsStore.get(sessionId, callback);
};

DbHandler.verifyPassword = function(user, password, callback)
{
	bcrypt.compare(password, user.password, callback);
};

module.exports = DbHandler;