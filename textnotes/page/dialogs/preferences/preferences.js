"use strict";

var log = null;
var io = null;
var model = null;
var gdrive = null;

async function init() {
    log = await Logger.create(false, "d");
    log.trace("Logger object has been created successfully.")

    log.debug("[START]");

    io = IO.create(log.getId());
    log.trace("IO object has been created successfully.")

    gdrive = GDrive.create();
    log.trace("GDrive object has been created successfully.")

    model = Model.create();
    log.trace("Model object has been created successfully.")

    setEvents();

    await initLogLevelSelect();
    loadModel(startPage);

    log.debug("[EXIT]");
}

function setEvents() {
    document.getElementById("exportButtonTn").addEventListener("click", ()=>exportAction("tn", exportAction2));
    document.getElementById("exportButtonTxt").addEventListener("click", ()=>exportAction("txt", exportAction2));
    document.getElementById("importButton").addEventListener("click", importAction);
    document.getElementById("fileSelector").addEventListener("change", importAction2, false);
    document.getElementById("deleteButton").addEventListener("click", deleteAction);
    document.getElementById("advancedButton").addEventListener("click", advancedAction);
    document.getElementById("gdriveSignIn").addEventListener("click", gdriveSignInAction);
    document.getElementById("gdriveSelect").addEventListener("change", gdriveSetButtons);
    document.getElementById("gdriveSave").addEventListener("click", ()=>exportAction("tn", gdriveSaveAction));
    document.getElementById("gdriveSaveAsText").addEventListener("click", ()=>exportAction("txt", gdriveSaveAction));
    document.getElementById("gdriveLoad").addEventListener("click", gdriveLoadAction); //check error messages
    document.getElementById("gdriveDelete").addEventListener("click", gdriveDeleteAction); //check error messages

    document.getElementById("logLevel").addEventListener("change", logLevelSelectChanged);

    log.trace("Events has been registered succesfuly.");
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
    if (event.ctrlKey) {
        document.getElementById("devsettings").classList.remove("hidden");
    }
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

function exportAction(type, doneHandler) {
    log.debug("[START]")
    log.debug("Type :" + type);

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

function showLoader(){
    document.getElementById("mainDiv").classList.add("blur_effect");
    document.getElementById("loader").style.display = "flex";
}

function hideLoader() {
    document.getElementById("mainDiv").classList.remove("blur_effect");
    document.getElementById("loader").style.display = "none";
}

function gdriveSetState() {
    log.debug("[START]");

    let select = document.getElementById("gdriveSelect");

    const resetSelect = () => {
        select.length = 0;
        let option = document.createElement("option");
        option.text = "Select a file to open or to delete";
        option.value = "titleOption";
        option.selected = true;
        option.disabled = true;
        option.hidden = true;
        select.add(option);
    }

    resetSelect();

    if (gdrive.isOAuth2Ready()) {
        log.debug("OAuth2 is ready");

        const fileList = gdrive.getFileList();
        const fileListKeys = Object.keys(fileList);
        for (const id of fileListKeys) {
            let option = document.createElement("option");
            option.text = fileList[id].name;
            option.value = id;
            option.title = new Date(fileList[id].modifiedTime).toLocaleString(undefined, { dateStyle : "medium", timeStyle : "short"});
            log.debug("id :" + id + ", name :" + option.text + ", modifiedTime :" + option.title);

            select.add(option);
        }

        document.getElementById("gdriveSignIn").disabled = true;
        select.disabled = (0 === fileListKeys.length);
        document.getElementById("gdriveLoad").disabled = true;
        document.getElementById("gdriveSave").disabled = false;
        document.getElementById("gdriveSaveAsText").disabled = false;
        document.getElementById("gdriveDelete").disabled = true;
    } else {
        log.debug("No OAuth2");
        document.getElementById("gdriveSignIn").disabled = false;
        select.disabled = true;
        document.getElementById("gdriveLoad").disabled = true;
        document.getElementById("gdriveSave").disabled = true;
        document.getElementById("gdriveSaveAsText").disabled = true;
        document.getElementById("gdriveDelete").disabled = true;
    }

    gdriveSetButtons();

    log.debug("[EXIT]");
}

function gdriveSetButtons() {
    log.debug("[START]");

    let select = document.getElementById("gdriveSelect");
    log.debug("Selected index :" + select.selectedIndex);

    if (select.options[select.selectedIndex].value === "titleOption") {
        log.debug("Selected title option");
    } else {
        log.debug("Selected real option");

        document.getElementById("gdriveLoad").disabled = false;
        document.getElementById("gdriveDelete").disabled = false;
        select.title = select.options[select.selectedIndex].title;
    }

    log.debug("[EXIT]");
}

function showErrorAndReset(source, message) {
    log.debug("[START]");

    gdrive.reset();
    gdriveSetState();
    hideLoader();

    alert("Some error occured while " + source + " : \n\n" + message + "\n\n" + "Try to sign in again!")

    log.debug("[EXIT]");
}

function gdriveSignInAction() {
    log.debug("[START]");

    showLoader();
    gdrive.reset();
    gdriveSetState();

    try {
        gdrive.doOAuth2(gdriveFetchData, (e) => showErrorAndReset("signing in to google", e));
    } catch(e) {
        log.error("Exception error while signing in to google : " + e);
        showErrorAndReset("signing in to google", e);
    }

    log.debug("[EXIT]");
}

async function gdriveFetchData() {
    log.debug("[START]");

    try {
        await gdrive.initDirectory();
        await gdrive.listFiles();
        gdriveSetState();
        hideLoader();
    } catch(e) {
        showErrorAndReset("fetching data from Google Drive", e)
    }

    log.debug("[EXIT]");
}

async function gdriveSaveAction(type) {
    log.debug("[START]")
    log.debug("Type :" + type);

    let select = document.getElementById("gdriveSelect");
    let defaultFileName = "";

    if (select.options[select.selectedIndex].value === "titleOption") {
        log.debug("There is no selected file");
        const date = new Date().toISOString().substring(0, 10);
        defaultFileName = "TextNotes_" + date + "." + type;
    } else {
        log.debug("There is a selected file");
        defaultFileName = select.options[select.selectedIndex].text.split(".")[0] + (type === "tn" ? ".tn" : ".txt");
    }

    let fileName = "";
    while(fileName.length === 0) {
        log.debug("Get filename");
        fileName = window.prompt("Please enter a file name :", defaultFileName);

        if (fileName === null) {
            log.debug("[CANCEL]")
            return;
        }
    }

    fileName = fileName.split(".")[0] + (type === "tn" ? ".tn" : ".txt");
    log.debug("Filename : " + fileName);

    let existingFileId = "";

    let index = 1;
    for(;index < select.length && select.options[index].text !== fileName; index++);

    log.debug("Found existing element : " + (index < select.length));

    if (index < select.length) {
        const message = fileName + "\n\nThis file name is already existing. Do you want to overwrite it?";
        if (!window.confirm(message)) {
            log.debug("[CANCEL]")
            return;
        }

        existingFileId = select.options[index].value;
        log.debug("Existing fileId : " + existingFileId);
    }

    let data;
    if (type == "tn") {
        let content = model.exportData();

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

        if (navigator.platform.indexOf("Win") != -1) {
            data = content.replace(/\n/g,'\r\n');
        } else {
            data = content;
        }

        log.debug("Text export has been successful!");
    }

    try {
        showLoader();

        if (existingFileId.length === 0) {
            log.debug("Saving file");
            await gdrive.saveFile(data, fileName);
        } else {
            log.debug("Updating file");
            await gdrive.updateFile(data, fileName, existingFileId);
        }

        await gdriveFetchData();

        hideLoader();
    } catch (e) {
        showErrorAndReset("saving data to Google Drive", e);
    }

    log.debug("[EXIT]");
}

async function gdriveLoadAction() {
    log.debug("[START]")

    try {
        let select = document.getElementById("gdriveSelect");
        const fileId = select.options[select.selectedIndex].value;

        showLoader();
        const data = await gdrive.loadFile(fileId)
        hideLoader();
        importAction3({ target : { result : data }});
    } catch(e) {
        showErrorAndReset("loading file from Google Drive", e);
    }

    log.debug("[EXIT]");
}

async function gdriveDeleteAction() {
    log.debug("[START]")

    try {
        let select = document.getElementById("gdriveSelect");
        const fileId = select.options[select.selectedIndex].value;

        let confirmMessage = "Are you sure to delete '" + select.options[select.selectedIndex].text + "' file ?"
        if (!window.confirm(confirmMessage)) {
            return;
        }

        showLoader();
        await gdrive.deleteFile(fileId)
        await gdriveFetchData();

        hideLoader();
    } catch(e) {
        showErrorAndReset("deleting file from Google Drive", e);
    }

    log.debug("[EXIT]")
}

window.onload = init;
