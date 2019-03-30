let _temp_text = '';

let defaultPreference = {
  currentPage: true,
  hyperlink: true,
  imageSource: true,
  simplifyCopy: 0, //0: full, 1: without 'https://'
  copyUrl: 0, //0: automatic, 1: manual
  showNotifications: true,
  autoClosePopup: true,
  service: 'TinyUrl',
  version: 1
};
let preferences = {};
let menuIdSet = {};

const storageChangeHandler = (changes, area) => {
  if(area === 'local') {
    let changedItems = Object.keys(changes);
    for (let item of changedItems) {
      preferences[item] = changes[item].newValue;
    }
    resetContextMenu();
    resetPopup();
  }
};

const loadPreference = () => {
  browser.storage.local.get().then(results => {
    if ((typeof results.length === 'number') && (results.length > 0)) {
    results = results[0];
    }
    if (!results.version) {
      preferences = defaultPreference;
      browser.storage.local.set(defaultPreference).then(res => {
        browser.storage.onChanged.addListener(storageChangeHandler);
      }, err => {
      });
    } else {
      preferences = results;
      browser.storage.onChanged.addListener(storageChangeHandler);
    }
    browser.storage.local.set({cacheText: ''});
    if (preferences.version !== defaultPreference.version) {
      let update = {};
      let needUpdate = false;
      for(let p in defaultPreference) {
        if(preferences[p] === undefined) {
          update[p] = defaultPreference[p];
          needUpdate = true;
        }
      }
      if(needUpdate) {
        update.version = defaultPreference.version;
        browser.storage.local.set(update).then(null, err => {});
      }
    }
    resetContextMenu();
    resetPopup();
  });
};

const resetContextMenu = () => {
  browser.contextMenus.removeAll(() => {
    menuIdSet = {};
    createContextMenu();
  });
};

const resetPopup = () => {
  let popup = preferences.copyUrl === 1 ? 'popup.html' : '';
  browser.browserAction.setPopup(
    {popup: popup}
  )
};

const createContextMenu = () => {
  if(preferences.currentPage) {
    menuIdSet.currentPage = browser.contextMenus.create({
      type: 'normal',
      title: `${preferences.service}(${browser.i18n.getMessage('currentPage')})`,
      contexts: ['page'],
      onclick: (info, tab) => {
        makeShortURL(tab.url);
      }
    });
  }
  if(preferences.imageSource) {
    menuIdSet.imageSource = browser.contextMenus.create({
      type: 'normal',
      title: `${preferences.service}(${browser.i18n.getMessage('imageSource')})`,
      contexts: ['image'],
      onclick: (info, tab) => {
        makeShortURL(info.srcUrl);
      }
    });
  }
  if(preferences.hyperlink) {
    menuIdSet.hyperlink = browser.contextMenus.create({
      type: 'normal',
      title: `${preferences.service}(${browser.i18n.getMessage('hyperlink')})`,
      contexts: ['link'],
      onclick: (info, tab) => {
        makeShortURL(info.linkUrl);
      }
    });
  }
};

function showNotification(message) {
  browser.notifications.create('Shorten URL', {
    'type': 'basic',
    'iconUrl': 'icon/icon.svg',
    'title': preferences.service,
    'message': message
  });
}

function copyToClipboard(text, callback) {
  navigator.clipboard.writeText(text).then(() => {
    callback(true);
  }, () => {
    callback(false);
  });
}

function tinyurlService(long_url, req, callback) {
  let apiUrl = "https://tinyurl.com/api-create.php?url=" + encodeURIComponent(long_url);
  req.onload = function(e) {
    let short_url = req.responseText.replace(/^http:\/\//, 'https://');
    callback(short_url);
  }
  req.open('GET', apiUrl);
  req.send();
}

function reurlService(long_url, req, callback) {
  let host = "https://reurl.cc/main/tw";
  let req2 = new XMLHttpRequest();
  req2.onload = function(e) {
    let apiUrl = "https://reurl.cc/api/shorten/v2";
    req.onload = function(e) {
      let response = JSON.parse(req.responseText);
      let short_url = `https://reurl.cc/${response.url}`
      callback(short_url);
    }
    req.open('POST', apiUrl);
    req.setRequestHeader('Content-Type', 'application/json');
    req.send(JSON.stringify({url: long_url}));
  }
  req2.open('GET', host);
  req2.send();
}

function makeShortURL(long_url, callback) {
  chrome.tabs.query({currentWindow: true, active: true}, tabs => {
    let tab;
    if (typeof tabs.length === 'number') {
      tab = tabs[0];
    }
    else {
      tab = tabs;
    }
    if(long_url === '')
      long_url = tab.url;

    let req = new XMLHttpRequest();
    req.onerror = function(e) {
      let message = browser.i18n.getMessage('error', browser.i18n.getMessage('creationFailed'));
      if(callback) {
        callback(message);
      }
      else {
        if(preferences.showNotifications) {
          showNotification(message);
        }
        else {
          copyToClipboard(message, result => {});
        }
      }
    }
    let service;
    if (preferences.service === 'TinyUrl') {
      service = tinyurlService;
    } else if (preferences.service === 'reurl') {
      service = reurlService;
    }
    service(long_url, req, short_url => {
      if(preferences.simplifyCopy === 1) {
        short_url = short_url.replace('https://','');
      }
      if(callback) {
        callback(null, short_url);
      }
      else {
        copyToClipboard(short_url, result => {
          if (result) {
            if(preferences.showNotifications) {
              showNotification(browser.i18n.getMessage('copiedToClipboard', [short_url, long_url]));
            }
          }
          else {
            showNotification(browser.i18n.getMessage('error', browser.i18n.getMessage('creationFailed')));
          }
        });
      }
    });
  });
}

function getTempText() {
  return _temp_text;
}

function getPreference(name) {
  return preferences[name];
}

browser.browserAction.onClicked.addListener(tab => {
  makeShortURL(tab.url);
});

window.addEventListener('DOMContentLoaded', event => {
  loadPreference();
});

const messageHandler = (message, sender, sendResponse) => {
  if(message.action === 'shortenUrl') {
    makeShortURL(message.url);
  }
  else if(message.action === 'shortenUrlWithResponse') {
    makeShortURL(message.url, (err, url) => {
      sendResponse({err: err, url: url});
    });
    return true;
  }
};

browser.runtime.onMessage.addListener(messageHandler);
browser.runtime.onMessageExternal.addListener(messageHandler);

/*
  APIs for other addon, for example:

  ```
  browser.runtime.sendMessage('shortenUrl@ettoolong',
  {
    action: 'shortenUrlWithResponse',
    url: data.element.linkHref
  }).then( message => {
    if(message.err) {
      // handle error message
    }
    console.log(message.url); //shortened URL
  });
  ```
  or

  ```
  browser.runtime.sendMessage('shortenUrl@ettoolong',
  {
    action: 'shortenUrl',
    url: data.element.linkHref
  }).then();
  ```
*/
