let self = require("sdk/self");
let data = self.data;
let xhr = require("sdk/net/xhr");
let notifications = require("sdk/notifications");
let tabs = require("sdk/tabs");
let _ = require("sdk/l10n").get;
let utils = require('sdk/window/utils');
let activeBrowserWindow = utils.getMostRecentBrowserWindow();
let tempUrl = '';

function showNotification(message) {
  notifications.notify({
    iconURL: data.url("images/icon.svg"),
    title: "Tiny URL",
    text: message
  });
}

function makeShortURL(long_url, callback) {
  //Encode URL
  let url = encodeURIComponent(long_url);

  let apiUrl = "https://tinyurl.com/api-create.php?url=" + url;
  let req = new xhr.XMLHttpRequest();
  req.onload = function(e) {
    let short_url = req.responseText;
		if(typeof(callback) === 'function'){
			callback(activeBrowserWindow, short_url);
		}else{
			require("sdk/clipboard").set(short_url);			
		}
    showNotification(_("copiedToClipboard", short_url, long_url));
  }
  req.onerror = function(e) {
    showNotification(_("creationFailed"));
  }
  req.open("GET", apiUrl);
  req.send();
}


if(activeBrowserWindow.NativeWindow){
	// Firefox for Android
	let nw = require('./nativewindow');
	let cb = require('./clipboard');

	let menuID = nw.addMenu({
		name: "Tiny URL",
		callback: function(){
			makeShortURL(activeBrowserWindow.content.location.href, cb.copyText);
		}
	});
	
	let handleUnload = function(reason){
		if (reason !== 'shutdown'){
			nw.removeMenu(menuID);
		}
	};

	exports.onUnload = handleUnload;

}else{
	//Firefox for desktop
	let contextMenu = require("sdk/context-menu");
	let menuItem = contextMenu.Item({
		label: "Tiny URL",
		image: data.url("images/icon.svg"),
		context: [
			contextMenu.PredicateContext(function(context){ tempUrl = context.linkURL || context.srcURL; return !!tempUrl;}),
			contextMenu.SelectorContext("a[href], img[src]")
		],
		contentScriptFile: data.url("js/context-menu.js"),
		onMessage: function (url) {
			url = url || tempUrl;
			if(url)
				makeShortURL(url);
		}
	});

	require("sdk/ui/button/action").ActionButton({
		id: "TinyURL-toolbutton",
		label: "Tiny URL",
		icon: {
			"16": data.url("images/icon.svg"),
			"32": data.url("images/icon.svg"),
			"64": data.url("images/icon.svg")
		},
		onClick:function handleClick(state) {
			//make from current page
			makeShortURL(tabs.activeTab.url);
		}
	});
	
}