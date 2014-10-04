'use strict';

var Room = function()
{
	this.dbHandler = null;
	this.roomId    = null;
	this.users     = null;
};

Room.prototype.init = function(dbHandler, roomId, callback)
{
	this.dbHandler = dbHandler;
	this.roomId = roomId;
	this.sockets = {};

	var self = this;
	dbHandler.requestCollection('room_'+roomId, function(err, collection)
	{
		if (err != null)
		{
			callback(err);
			return;
		}

		self.users = collection;
		callback(null);
	});
};

var createMsg = function(msg, user, toSelf)
{
	return {
		username: user._id,
		date: new Date(),
		message: msg,
		toSelf: toSelf
	};
};

Room.prototype.sendMsgTo = function(socket, msg)
{
	socket.emit('msg', JSON.stringify(msg));
	return true;
};

Room.prototype.msg = function(message, user, callback)
{
	var self = this;
	var stop = false;

	var msg = createMsg(message, user, false);
	if (!this.sendMsgTo(self.sockets[user._id],
		createMsg(message, user, true), callback)) return;

	this.users.find({_id: {$ne: user._id}})
		.each(function(err, user)
	{
		if (stop) return;
		if (err != null)
		{
			callback(err);
			stop = true;
			return;	
		}

		if (user == null)
		{
			stop = true;
			return;
		}

		if (!self.sendMsgTo(self.sockets[user._id],
			msg, callback)) stop = true;
	});
	if (stop) return;

	callback(null);
};

Room.prototype.getUser = function(username, callback)
{
	this.users.findOne({_id: username}, function(err, user)
	{		
		if (err != null)
		{
			callback(err, null);
			return;
		}

		callback(null, user);
	});
};

Room.prototype.addUser = function(username, socket, callback)
{
	this.sockets[username] = socket;
	this.users.insert({_id: username},
		function(err)
	{		
		if (err != null)
		{
			callback(err);
			return;
		}
		callback(null);
	});
};

Room.prototype.tryAddUser = function(username, socket, callback)
{
	var self = this;
	this.sockets[username] = socket; //Should be set regardless of user existing
	this.getUser(username, function(err, user)
	{
		if (err != null)
		{
			callback(err);
			return;
		}

		if (user != null)
		{
			callback(null);
			return;
		}

		self.addUser(username, socket, callback);
	});
};


Room.prototype.removeUser = function(username, callback)
{
	this.users.remove({_id: username}, function(err)
	{		
		if (err != null)
		{
			callback(err);
			return;
		}
		callback(null);
	});
};

module.exports = Room;