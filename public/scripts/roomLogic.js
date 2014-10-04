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

	div.classList.add('msg');
	if (msg.toSelf) div.classList.add('toSelf');

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

var sendMsg = function()
{
	socket.emit('msg', msgInput.value);
	msgInput.value = '';
};

sendBtn.addEventListener('click', sendMsg);
msgInput.addEventListener('keypress', function(event)
{
	if (event.keyCode === 13) sendMsg();
});

socket.on('msg', function(msgStr)
{
	var msg = JSON.parse(msgStr);
	console.log(msg);
	addMsg(msg);
});

})();