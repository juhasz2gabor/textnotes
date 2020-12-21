window.errorOnPage = false;

function errorHandler(msg, url, lineNo, columnNo, error) {

    window.errorOnPage = true;

    var errorMessage = [
        '',
        'Message : ' + msg,
        'URL : ' + url,
        'Line : ' + lineNo,
        'Column : ' + columnNo,
        'Error object : ' + JSON.stringify(error)
    ].join('\n - ') + "\n ";

    const message1 = "Oops, something went wrong. Please restart your browser!\n ";
    const message2 = "\nThis page will be closed!\n "

    alert(message1 + errorMessage + message2);

    window.parent.close();

    window.setTimeout(()=> { alert("TextNotes can not be closed, please restart your browser!") }, 1000);

    return true;
};

function errorHandler2(event) {
    errorHandler(event.reason, "", "", "", event);
}

window.onerror = errorHandler;
window.onunhandledrejection = errorHandler2;
