'use strict';

//Libraries
var socketio = require('socket.io');

//Cookies
var parseCookie = require('cookie').parse;
var cookieSignature = require('cookie-signature');

//My
var serverUtils = require('./util');

var init = function(dbHandler, server)
{
	var io = socketio(server);
	io.set('authorization', function(data, accept)
	{
		console.log('DATA', data);
		if(data.headers.cookie)
		{
	        data.cookie = parseCookie(data.headers.cookie);
	        var sid = data.cookie['connect.sid'];//s:REAL_SID.HASH_OF_SECRET

	        sid = sid.substring(2, sid.length);//REAL_SID.HASH_OF_SECRET
			data.sessionId =
				cookieSignature.unsign(sid, serverUtils.secret);//REAL_SID

			dbHandler.getRoom(data.cookie.roomId, function(err, room)
			{
				if (err != null)
				{
					accept(err, false);
					return;
				}
				if (room == null)
				{
					accept('No such room', false);
	        		return;
				}

				data.room = room;
			});

	    }
	    else
	    {
	    	accept('No cookie transmitted', false);
			return;
	    }

	    accept(null, true);
	});

	io.on('connection', function(socket)
	{
		var data = socket.client.request;

		dbHandler.getSession(data.sessionId,
		function(err, session)
		{
			if (err != null) throw new Error(err);

			var user = session.user;
			data.room.addUser(user.username, function(err)
			{
				if (err != null) throw new Error(err);

				socket.on('msg', function(msg)
				{
					data.room.msg(msg, user, function(err)
					{
						if (err != null) throw new Error(err);
					});
				});
			});
		});
	});
};

module.exports =
{
	init: init
};