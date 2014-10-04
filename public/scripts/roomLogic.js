/* global io */

(function ()
{
	'use strict';

	var socket = io();
	var msgsElement = document.getElementById('msgs');
	var sendBtn = document.getElementById('sendBtn');
	var msgInput = document.getElementById('msgInput');

	var addMsg = function(msg)
	{
		var div = document.createElement('div');

		var username = document.createElement('strong');
		username.innerText = msg.username + ': ';

		var date = document.createElement('em');
		date.innerText = msg.date;

		var p = document.createElement('p');
		div.appendChild(username);
		div.appendChild(date);
		div.appendChild(p);

		p.innerHTML = msg.message;

		msgsElement.appendChild(div);
	};

	sendBtn.addEventListener('click', function()
	{
		socket.emit('msg', msgInput.value);
		msgInput.value = '';
	});

	socket.on('msg', function(msgStr)
	{
		var msg = JSON.parse(msgStr);
		addMsg(msg);
	});
})();