window.addEventListener('load', event => {
  let elem = document.getElementById('message');
  elem.textContent = browser.i18n.getMessage('processing');
  let shortenedURL = '';

  let btn = document.getElementById('btnCopy');
  // btn.style.display = 'block';
  btn.value = browser.i18n.getMessage('btnCopy');
  btn.addEventListener('click', event => {
    browser.extension.getBackgroundPage().copyToClipboard(shortenedURL, res => {
      let autoClosePopup = browser.extension.getBackgroundPage().getPreference('autoClosePopup');
      if(autoClosePopup)
        window.close();
    });
  });

  browser.runtime.sendMessage({action: 'shortenUrlWithResponse', url:''})
  .then(message => {
    if(message.err) {
      elem.textContent = message.err;
    }
    else {
      shortenedURL = message.url;
      elem.textContent = browser.i18n.getMessage('shortenedURL') + message.url;
      btn.style.display = 'block';
    }
  }, error => {
  });
});
