let self = require("sdk/self");
let data = self.data;
let contextMenu = require("sdk/context-menu");
let xhr = require("sdk/net/xhr");
let notifications = require("sdk/notifications");
let clipboard = require("sdk/clipboard");
let tabs = require("sdk/tabs");
let _ = require("sdk/l10n").get;
let tempUrl = '';

function showNotification(message) {
  notifications.notify({
    iconURL: data.url("images/icon.svg"),
    title: "Tiny URL",
    text: message
  });
}

function makeShortURL(long_url) {
  //Encode URL
  var url = encodeURIComponent(long_url);

  let apiUrl = "https://tinyurl.com/api-create.php?url=" + url;
  let req = new xhr.XMLHttpRequest();
  req.onload = function(e) {
    let short_url = req.responseText;
    clipboard.set(short_url);
    showNotification(_("copiedToClipboard", short_url, long_url));
  }
  req.onerror = function(e) {
    showNotification(_("creationFailed"));
  }
  req.open("GET", apiUrl);
  req.send();
}

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
