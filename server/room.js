'use strict';

var Room = function(dbHandler, roomId, callback)
{
	this.dbHandler = dbHandler;
	this.roomId = roomId;

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

var sendMsgTo = function(username, msg, callback)
{
	this.dbHandler.getUser(username, function(err, user)
	{
		if (err != null)
		{
			callback(err);
			return;
		}

		user.socket.emit(msg);
	});
};

Room.prototype.msg = function(msg, user, callback)
{
	this.users.find({_id: {$ne: user.username}})
		.toArray(function(err, usernames)
	{
		if (err != null)
		{
			callback(err);
			return;	
		}

		for (var i = 0; i < usernames.length; i++)
		{
			if (!sendMsgTo(usernames[i], msg, callback)) return;
		}
	});
};

Room.prototype.addUser = function(username, callback)
{
	this.users.insert({_id: username}, function(err)
	{		
		if (err != null)
		{
			callback(err);
			return;
		}
		callback(null);
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