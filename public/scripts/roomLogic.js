/* global io */

(function ()
{

'use strict';

var socket = io();
var msgsElement = document.getElementById('msgs');
var sendBtn = document.getElementById('sendBtn');
var msgInput = document.getElementById('msgInput');

var formatDate = function(date)
{
	return date.getDate()+'/'+date.getMonth()+'/'+date.getFullYear()+' '+
		   date.getHours()+':'+date.getMinutes()+':'+date.getSeconds();
};

var addMsg = function(msg)
{
	var div = document.createElement('div');

	div.classList.add('msg');
	if (msg.toSelf) div.classList.add('toSelf');

	var username = document.createElement('strong');
	username.innerText = msg.username + ': ';

	var date = document.createElement('div');
	var dateInner = document.createElement('small');
	dateInner.className = 'dateElement';

	var dateVal = new Date(0);
	dateVal.setUTCMilliseconds(parseInt(msg.date));
	dateInner.innerText = formatDate(dateVal);
	date.appendChild(dateInner);

	var p = document.createElement('p');
	div.appendChild(username);
	div.appendChild(p);
	div.appendChild(date);

	p.innerHTML = msg.message;

	msgsElement.appendChild(div);
};

var sendMsg = function()
{
	socket.emit('msg', JSON.stringify({message: msgInput.value, date: new Date().getTime()}));
	msgInput.value = '';
};

var scrollToEnd = function()
{
	window.scrollTo(0, document.body.scrollHeight);
};

sendBtn.addEventListener('click', sendMsg);
msgInput.addEventListener('keypress', function(event)
{
	if (event.keyCode === 13) sendMsg();
});

socket.on('msg', function(msgStr)
{
	var msg = JSON.parse(msgStr);
	var shouldScroll = ($(window).scrollTop() + $(window).height() == $(document).height());
	addMsg(msg);
	if (shouldScroll) scrollToEnd();
});

})();