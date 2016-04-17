'use strict';
/*
 * This Source Code is modified from https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Using_the_clipboard 
 */

//Cc = Components.classes
//Ci = Components.interfaces
//Cu = Components.utils
//CC = Components.Constructor
let { Ci, Cu, CC } = require('chrome');
Cu.import('resource://gre/modules/Services.jsm');

const nsSupportsString = CC("@mozilla.org/supports-string;1", "nsISupportsString");
function SupportsString(str) {
    var res = nsSupportsString();
    res.data = str;
    return res;
}

const nsTransferable = CC("@mozilla.org/widget/transferable;1", "nsITransferable");
function Transferable(source) {
    var res = nsTransferable();
    if ('init' in res) {
        if (source instanceof Ci.nsIDOMWindow)
            source = source.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation);
        res.init(source);
    }
    return res;
}

function copyText(window, text){
	var trans = Transferable(window);
	trans.addDataFlavor("text/unicode");
	trans.setTransferData("text/unicode", SupportsString(text), text.length * 2);
	Services.clipboard.setData(trans, null, Services.clipboard.kGlobalClipboard);
}

exports.copyText = copyText;