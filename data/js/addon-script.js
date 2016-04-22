let self = require("sdk/self");
let data = self.data;
let xhr = require("sdk/net/xhr");
let notifications = require("sdk/notifications");
let tabs = require("sdk/tabs");
let _ = require("sdk/l10n").get;
let utils = require('sdk/window/utils');
let activeBrowserWindow = utils.getMostRecentBrowserWindow();
let tempUrl = '';
let mobileMode = '';
let startup = [];
let unload = [];

const {Cc, Ci} = require("chrome");

let pref = require("sdk/preferences/service");
let addonPrefs = {};
var prefRoot = "extensions.@tinyurl.";
let prefsList = ["urlbarIcon"];
for(let prefkey of prefsList){
  addonPrefs[prefsList] = pref.get(prefRoot + prefsList);
}

// Add an icon to awesomebar for specific window
function addAwesomebarIcon(chromeWindow) {
  if(mobileMode)
    return;
  let clipboard = require("sdk/clipboard");
  // this document is an XUL document
  //let document = mediator.getMostRecentWindow('navigator:browser').document;
  let aDOMWindow = chromeWindow.QueryInterface(Ci.nsIInterfaceRequestor).
        getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
  let document = aDOMWindow.document;
  let urlBar = document.getElementById('urlbar-icons');
  let btn = document.getElementById('TinyURL-urlbarbutton');
  if (!urlBar || btn) {
    return;
  }
  btn = document.createElement('image');
  btn.setAttribute('id', 'TinyURL-urlbarbutton');
  btn.setAttribute('class', 'urlbar-icon');
  btn.setAttribute('src', data.url("images/icon-gray.svg"));
  btn.setAttribute('tooltiptext', "Tiny URL");
  btn.addEventListener('click', function() {
    //make from current page
    makeShortURL(tabs.activeTab.url, function(short_url){
      clipboard.set(short_url);
    });
  }, false);
  btn.addEventListener('mouseover', function() {
    btn.setAttribute('src', data.url("images/icon.svg"));
  }, false);
  btn.addEventListener('mouseout', function() {
    btn.setAttribute('src', data.url("images/icon-gray.svg"));
  }, false);
  urlBar.appendChild(btn);
}

// Remove an icon from the awesomebar for specific window
function removeAwesomebarIcon(chromeWindow) {
  if(mobileMode)
    return;
  // this document is an XUL document
  //let document = mediator.getMostRecentWindow('navigator:browser').document;
  let aDOMWindow = chromeWindow.QueryInterface(Ci.nsIInterfaceRequestor).
        getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
  let document = aDOMWindow.document;
  let urlBar = document.getElementById('urlbar-icons');
  let btn = document.getElementById('TinyURL-urlbarbutton');
  if (urlBar && btn)
    urlBar.removeChild(btn);
}

// Add an icon to awesomebar for currently opened browser windows
function addWinAwesomebarIcon() {
  if(mobileMode)
    return;

  // addon sdk bug :(  see: https://bugzil.la/1196577
  // let windows = require("sdk/windows").browserWindows;
  // let { viewFor } = require("sdk/view/core");
  // for (let window of windows) {
  //   let chromeWindow = viewFor(window);
  //   addAwesomebarIcon(chromeWindow);
  // }

  let windows = utils.windows(null, {includePrivate:true});
  for (let window of windows) {
    addAwesomebarIcon(window);
  }
}

// Remove an icon from the awesomebar for currently opened browser windows
function removeWinAwesomebarIcon() {
  if(mobileMode)
    return;
  let windows = utils.windows(null, {includePrivate:true});
  for (let window of windows) {
    removeAwesomebarIcon(window);
  }
}

// Display notification message
function showNotification(message) {
  notifications.notify({
    iconURL: data.url("images/icon.svg"),
    title: "Tiny URL",
    text: message
  });
}

//Create short URL
function makeShortURL(long_url, callback) {
  //Encode URL
  let url = encodeURIComponent(long_url);

  let apiUrl = "https://tinyurl.com/api-create.php?url=" + url;
  let req = new xhr.XMLHttpRequest();
  req.onload = function(e) {
    let short_url = req.responseText;
    if(typeof(callback) === 'function'){
      callback(short_url);
    }
    showNotification(_("copiedToClipboard", short_url, long_url));
  }
  req.onerror = function(e) {
    showNotification(_("creationFailed"));
  }
  req.open("GET", apiUrl);
  req.send();
}

if(activeBrowserWindow.NativeWindow) {
  // Firefox for Android
  mobileMode = true;
  let nw = require('./nativewindow');
  let clipboard = require('./clipboard');

  let menuID = nw.addMenu({
    name: "Tiny URL",
    callback: function(){
      makeShortURL(activeBrowserWindow.content.location.href, function(short_url){
        clipboard.copyText(activeBrowserWindow, short_url);
      });
    }
  });

  let handleUnload = function(reason){
    if (reason !== 'shutdown'){
      nw.removeMenu(menuID);
    }
  };
  unload.push(handleUnload);
}
else {
  //Firefox for desktop
  mobileMode = false;
  let clipboard = require("sdk/clipboard");
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
      if(url) {
        makeShortURL(url, function(short_url){
          clipboard.set(short_url);
        });
      }
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
      makeShortURL(tabs.activeTab.url, function(short_url){
        clipboard.set(short_url);
      });
    }
  });

  let { viewFor } = require("sdk/view/core");
  let windows = require("sdk/windows").browserWindows;

  let init = function(reason){
    // check addon's preferences
    // if enable urlbarIcon, add icon to awesomebar
    if(addonPrefs.urlbarIcon) {
      addWinAwesomebarIcon();
    }
    windows.on("open" , function (win){
      if(addonPrefs.urlbarIcon) {
        addAwesomebarIcon( viewFor(win) );
      }
    });
  }

  let release = function(reason){
    if (reason !== "shutdown"){
      //disable or uninstall, remove icon from awesomebar
      removeWinAwesomebarIcon();
    }
  }

  startup.push(init);
  unload.push(release);
}

require("sdk/simple-prefs").on("", function(prefName){
  addonPrefs[prefName] = pref.get(prefRoot + prefName);
  if(prefName === "urlbarIcon") {
    if(addonPrefs.urlbarIcon) {
      //if enable urlbarIcon, add icon to awesomebar
      addWinAwesomebarIcon();
    }
    else {
      //if disable urlbarIcon, remove icon from awesomebar
      removeWinAwesomebarIcon();
    }
  }
});

exports.main = function (options, callbacks) {
  for(let func of startup){
    if(typeof(func) === "function") {
      func(options.loadReason);
    }
  }
}

exports.onUnload = function (reason) {
  for(let func of unload){
    if(typeof(func) === "function") {
      func(reason);
    }
  }
}
