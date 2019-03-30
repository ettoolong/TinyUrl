let currentPrefs = {};

const saveToPreference = (id, value) => {
  let update = {};
  update[id] = value;

  if (id === 'service') {
    let permissions = {origins: ['https://reurl.cc/api/shorten/v2','https://reurl.cc/main/tw']};
    if (value === 'reurl' ) {
      browser.permissions.request(permissions)
      .then(response => {
        if (response) {
          browser.storage.local.set(update).then(null, err => {});
        } else {
          document.getElementById('tinyurl').checked = true;
        }
      });
    } else {
      browser.permissions.remove(permissions);
    }
  } else {
    browser.storage.local.set(update).then(null, err => {});
  }
};

const handleVelueChange = id => {
  let elem = document.getElementById(id);
  if(elem) {
    let elemType = elem.getAttribute('type');
    if(elemType === 'checkbox') {
      elem.addEventListener('input', event => {
        saveToPreference(id, elem.checked ? true : false);
      });
    }
    else if(elemType === 'radioGroup') {
      let radios = Array.from(elem.querySelectorAll('input[name='+id+']'));
      for(let radio of radios) {
        radio.addEventListener('input', event => {
          saveToPreference(id, parseInt(radio.getAttribute("value")));
        });
      }
    }
    else if(elemType === 'radioGroupStr') {
      let radios = Array.from(elem.querySelectorAll('input[name='+id+']'));
      for(let radio of radios) {
        radio.addEventListener('input', event => {
          saveToPreference(id, radio.getAttribute("value"));
        });
      }
    }
  }
};

const setValueToElem = (id, value) => {
  let elem = document.getElementById(id);
  if(elem) {
    let elemType = elem.getAttribute('type');
    if(elemType === 'checkbox') {
      elem.checked = value;
    }
    else if(elemType === 'radioGroup') {
      let radios = Array.from(elem.querySelectorAll('input[name='+id+']'));
      for(let radio of radios) {
        if(parseInt(radio.getAttribute('value')) === value) {
          radio.checked = true;
          break;
        }
      }
    }
    else if(elemType === 'radioGroupStr') {
      let radios = Array.from(elem.querySelectorAll('input[name='+id+']'));
      for(let radio of radios) {
        if(radio.getAttribute('value') === value) {
          radio.checked = true;
          break;
        }
      }
    }
  }
};

const init = preferences => {
  currentPrefs = preferences;
  for(let p in preferences) {
    setValueToElem(p, preferences[p]);
    handleVelueChange(p);
  }
  let l10nTags = Array.from(document.querySelectorAll('[data-l10n-id]'));
  l10nTags.forEach(tag => {
    tag.textContent = browser.i18n.getMessage(tag.getAttribute('data-l10n-id'));
  });
};

window.addEventListener('load', event => {
  browser.storage.local.get().then(results => {
    if ((typeof results.length === 'number') && (results.length > 0)) {
      results = results[0];
    }
    if (results.version) {
      init(results);
    }
  });
}, true);
