"use strict";

var log = null;
var io = null;
var model = null;

async function init() {
    log = await Logger.create(false, "d");
    log.trace("Logger object has been created successfully.")

    log.debug("[START]");

    io = IO.create(log.getId());
    log.trace("IO object has been created successfully.")

    model = Model.create();
    log.trace("Model object has been created successfully.")

    document.getElementById("exportButtonTn").addEventListener("click", ()=>exportAction("tn"));
    document.getElementById("exportButtonTxt").addEventListener("click", ()=>exportAction("txt"));
    document.getElementById("importButton").addEventListener("click", importAction);
    document.getElementById("fileSelector").addEventListener("change", importAction2, false);
    document.getElementById("deleteButton").addEventListener("click", deleteAction);
    document.getElementById("advancedButton").addEventListener("click", advancedAction);
    document.getElementById("logLevel").addEventListener("change", logLevelSelectChanged);
    log.trace("Events has been registered succesfuly.");

    await initLogLevelSelect();
    loadModel(startPage);

    log.debug("[EXIT]");
}

function startPage() {
    setDisplayMode();
    setDisplayModeEvents();

    log.info("TextNotes Preferences page started");
}

function setDisplayMode() {
    var displayMode = getUIState("displayMode");

    log.info("DisplayMode :" + displayMode);

    switch(displayMode)
    {
        case "light":
            document.getElementById("modeLight").checked = true;
        break;

        case "dark":
            document.getElementById("modeDark").checked = true;
        break;

        default :
            document.getElementById("modeAuto").checked = true;
    }
}

function setDisplayModeEvents() {
    let onDisplayModeChanged = (event)=>{
        setUIState("displayMode", event.target.value);
        model.save(() => { window.parent.location.reload(); });
    }

    document.getElementById("modeLight").addEventListener("change", onDisplayModeChanged);
    document.getElementById("modeDark").addEventListener("change", onDisplayModeChanged);
    document.getElementById("modeAuto").addEventListener("change", onDisplayModeChanged);
}

function loadModel(doneHandler) {
    log.debug("[START]");

    let errorHandler = function(errorMessage) {
        log.debug("[START]");

        model.reset();

        const message1 = "\n\nOops, something went wrong. Please restart your browser!\n ";
        const message2 = "\nThis page will be closed!\n "

        alert("Error :" + errorMessage + message1 + message2);

        window.parent.close();

        window.setTimeout(()=> { alert("TextNotes can not be closed, please restart your browser!") }, 1000);

        log.debug("[EXIT]");
    }

    model.load(doneHandler, errorHandler);

    log.debug("[EXIT]");
}

function setUIState(name, value) {
    log.debug("[START]");

    log.trace("uistate[" + name + "] =" + value);

    let uistate = model.getUIState();

    uistate[name] = value;

    model.setUIState(uistate);

    log.debug("[EXIT]");
}

function getUIState(name) {
    log.debug("[START]");

    let uistate = model.getUIState();
    let value = "";

    if ( uistate.hasOwnProperty(name) ) {
        value = uistate[name];
        log.trace("uistate[" + name + "] =" + value);
    } else {
        log.debug("No property in UIState :" + name);
    }

    log.debug("[EXIT]");

    return value;
}

function advancedAction() {
    document.getElementById("devsettings").classList.remove("hidden");
}

async function initLogLevelSelect() {
    log.debug("[START]");

    let logLevelSelect = document.getElementById("logLevel");
    let levels = Object.keys(Logger.Severity);

    for (let value in levels) {
        let option = document.createElement("option");
        option.value = levels[value];
        option.text = levels[value];
        logLevelSelect.add(option);
    }

    logLevelSelect.value = await Logger.getLogLevel();
    log.trace("LogLevel :" + logLevelSelect.value);

    log.debug("[EXIT]");
}

async function logLevelSelectChanged() {
    log.debug("[START]");

    let logLevelSelect = document.getElementById("logLevel");

    let result = await Logger.setLogLevel(logLevelSelect.value);

    if (result !== true) {
        log.error("Some error occured while setting LogLevel : " + result);
        alert("Log Level couldn't be set :" + result);
    } else {
        log.debug("Log Level has been set successfully : " + logLevelSelect.value.toLowerCase());
    }

    log.debug("[EXIT]");
}

function exportAction(type) {
    log.debug("[START]")
    log.debug("Type :" + type);

    let doneHandler = exportAction2;

    let errorHandler = function(message) {
        log.error("Message :" + message);
        alert("Data couldn't be loaded : '" + message + "'");
    }

    model.load(()=>doneHandler(type), errorHandler);

    log.debug("[EXIT]")
}

function exportAction2(type) {
    log.debug("[START]")
    log.debug("Type :" + type);

    let data;
    let date = new Date().toISOString().substring(0, 10);
    let fileName = "TextNotes_" + date;

    if (type == "tn") {
        let content = model.exportData();
        fileName += ".tn";

        log.debug("Content [0,256] :" + content.substring(0,256));
        log.debug("Date :" + date);
        log.debug("FileName : " + fileName);

        try {
            data = pako.gzip(content , { to: 'string' });
        } catch (error) {
            alert("Some error occured while compressing data : '" + error + "'");
            log.error("Data couldn't be compressed by pako lib : " + error);
            return;
        }

        log.debug("Compression has been successful!");
    } else {
        let content = model.exportDataAsText();
        fileName += ".txt";

        log.debug("Content [0,256] :" + content.substring(0,256));
        log.debug("Date :" + date);
        log.debug("FileName : " + fileName);

        if (navigator.platform.indexOf("Win") != -1) {
            data = content.replace(/\n/g,'\r\n');
        } else {
            data = content;
        }

        log.debug("Text export has been successful!");
    }

    let obj = document.createElement('a');
    obj.setAttribute('href', 'data:application/octet-stream,' + encodeURIComponent(data));
    obj.setAttribute('download', fileName);
    log.debug("Dummy 'a' element has been created successfully!");

    let event = document.createEvent('MouseEvents');
    event.initEvent('click', true, true);
    obj.dispatchEvent(event);
    log.debug("Click event on 'a' element has been sent successfully");

    log.debug("[EXIT]")
}

function importAction() {
    log.debug("[START]");
    document.getElementById("fileSelector").click();
    log.debug("[EXIT]");
}

function importAction2(event) {
    log.debug("[START]");

    let file = event.target.files[0];

    log.debug("FileName : " +  file.name);

    let errorHandler = function(message) {
        log.error("File could not be read :" + message);
        alert("File could not be read : " + message);
    };

    let reader = new FileReader();
    reader.onload = importAction3;
    reader.onerror = errorHandler;

    try {
        reader.readAsText(file);
    } catch(error) {
        errorHandler(error);
        return;
    }

    log.debug("[EXIT]");
}

function importAction3(event) {
    log.debug("[START]");

    let content;
    let data = event.target.result;
    let textPrefix = "TextNotes";

    if (data.startsWith(textPrefix)) {
        try {
            model.importDataAsText(data);
        } catch (e) {
            alert("Some error occurred while importing data (text) : \n" + e);
            log.error("Some error occurred while importing data (text) : " + e);
            return;
        }
    } else {
        try {
            content = pako.ungzip(data, { to: 'string' });
            model.importData(content);
        } catch (e) {
            alert("Some error occurred while importing data (gzip) : \n" + e);
            log.error("Some error occurred while importing data (gzip) : " + e);
            return;
        }

        log.debug("Decompression has been successful (gzip)!");
    }

    let doneHandler = function() {
        alert("Data have been imported successfully");
        closeDialog();
        log.trace("Data have been imported successfully");
    }

    let errorHandler = function(message) {
        if (message === null || message === undefined) {
            message = "no detailed information";
        }

        alert("Some error occurred while importing data.\nData could not be saved : " + message);
        log.error("Some error occurred while importing data. Data could not be saved : " + message);
        return;
    }

    model.save(doneHandler, errorHandler);

    log.debug("[EXIT]");
}

function deleteAction() {
    log.debug("[START]");

    let confirmMessage = "Are you sure to delete all data?"

    let doneHandler = function() {
        alert("All data have been removed successfully");
        closeDialog();
        log.trace("All data have been removed successfully");
    }

    let errorHandler = function(message) {
        if (message === null || message === undefined) {
            message = "no detailed information";
        }
        alert("Some error occurred while deleting all data :\n" + message);
        log.error("Some error occurred while deleting all data :" + message);
    }

    if (window.confirm(confirmMessage)) {
        io.del(doneHandler, errorHandler);
        log.debug("All data have been removed!");
    } else {
        log.debug("Delete action has been canceled!")
    }

    log.debug("[EXIT]");
}

window.onload = init;
