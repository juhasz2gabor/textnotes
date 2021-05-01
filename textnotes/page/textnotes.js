"use strict";

const pageTitle = "TextNotes";

var log = null;
var io = null;
var model = null;
var dialog = null;

var activeTaskItem = null;
var openTrashbin = null;
var displayMode = null;
var currentCursorPosition = null;
var notificationTimerId = 0;

var disableTabInTextArea = false;
var capslockonSimulation = false;
var autoDarkModeSimulation = false;

async function initTextNotes() {
    log = await Logger.create();
    log.trace("Logger obj has been created successfully.")

    log.debug("[START]");

    io = IO.create(log.getId());
    log.trace("IO obj has been created successfully.")

    model = Model.create();
    log.trace("Model obj has been created successfully.")

    dialog = Dialog.create();
    log.trace("Dialog obj has been created successfully.")

    let version = browser.runtime.getManifest().version;

    if (version == "") {
        log.error("Version string of Manifest file is empty!");
    }

    log.debug("TextNotes is starting");

    document.title = pageTitle;

    loadModel();

    log.debug("[EXIT]");
}

function loadModel() {
    log.debug("[START]");

    let doneHandler = function() {
        startTextNotes();
    }

    let errorHandler = function(message) {
        log.debug("[START]");

        setPageHidden();
        model.reset();

        log.fatal("Data couldn't be loaded : '" + message + "'");
        alert("Some error occurred while loading data :'" + message + "'");
        alert("\t\t\tRestart your browser!\n\nOr use the preference page of TextNotes to solve the issue.\n\n");

        log.debug("[EXIT]");
    }

    model.load(doneHandler, errorHandler);

    log.debug("[EXIT]");
}

function reloadModel() {
    log.debug("[START]");

    let doneHandler = function() {
        update();
    }

    let errorHandler = function(message) {
        log.debug("[START]");

        setPageHidden();
        model.reset();

        log.fatal("Data couldn't be reloaded : '" + message + "'");
        alert("Some error occurred while reloading data :'" + message + "'");
        alert("\t\t\tRestart your browser!\n\nOr use the preference page of TextNotes to solve the issue.\n\n");

        log.debug("[EXIT]");
    }

    model.load(doneHandler, errorHandler);

    log.debug("[EXIT]");
}

function startTextNotes() {
    log.debug("[START]");

    initPage();
    loadUIState();
    update();
    registerPage();
    log.debug("[EXIT]");
}

function startTextNotes2() {
    newVersionMessage();
    log.info("TextNotes started");

    if (model.getRoot().length <= 1) {
        addNoteAction();
    }
}

function registerPage() {
    log.debug("[START]");

    let doneHandler = function() {
        log.debug("Registration was successful!");
        startTextNotes2();
    };

    let errorHandler = function(msg) {
        log.debug("[START]");

        setPageHidden();
        model.reset();

        log.fatal("Fatal error while registering the page :" + msg);
        alert("Some error occured while registering the page : " + msg + "\n\nRestart your browser!");

        log.debug("[EXIT]");
    };

    let message = { type: "register", command : "add", tabId : log.getTabId() };

    try {
        browser.runtime.sendMessage(message).then(doneHandler, errorHandler);
    } catch (e) {
        log.debug("Exception occured!");
        errorHandler(e);
    }

    log.debug("[EXIT]");
}

function initPage() {
    log.debug("[START]");

    setToolbarEvents();
    setTextAreaEvents();
    setDragBarEvents();
    setTaskListEvents();
    setPageEvents();

    log.debug("[EXIT]");
}

function loadUIState() {
    log.debug("[START]");

    let DragBarState_PageX = getUIState("DragBarState_PageX");

    if (DragBarState_PageX !== "") {
        setDragBarState(DragBarState_PageX);
    } else {
        setDragBarState();
    }

    activeTaskItem = getUIState("activeTaskItem");
    openTrashbin = Boolean(getUIState("openTrashbin"));
    displayMode = getUIState("displayMode");

    log.debug("[EXIT]");
}

function update() {
    log.debug("[START]");

    setPageHidden();
    updateTaskList();
    setActiveItem(activeTaskItem);
    model.resetChanged();
    setDisplayMode();
    setPageVisible();
    document.getElementById("taskList").focus();

    log.debug("[EXIT]");
}

function newVersionMessage()
{
    let welcomeMessage =
              "Thanks for using TextNotes!\n\n"
            + "New things in version 1.7 :\n\n";

    welcomeMessage += ""
            + "- Display modes : dark, light, auto\n"
            + "- Creating notes from webpages : appending to top note\n"
            + "- Minor bug fixes\n"

    welcomeMessage +=
            "\nif you find a bug, please report it : gabor.shepherd.work@gmail.com\n"

    welcomeMessage += "\nPlease always update to the latest version of TextNotes.\n"
                      + "The old versions may not work properly with the latest Firefox!\n"

    let getHandler = (messageVersion) => {
        log.info("messageVersion :" + messageVersion + ", model._version :" + model._version);
        if (messageVersion != model._version) {
            alert(welcomeMessage);
            let prefix = "In newVersionMessage::getHandler() : "
            io.setByKey(io._messageVersionKey, model._version, null, (m) => { alert(prefix + m); });
        }
    }

    let prefix = "In newVersionMessage() : "
    io.getByKey(io._messageVersionKey, getHandler, (m) => { alert(prefix + m); });
}

function setPageHidden() {
    log.trace("[START]");
    document.querySelector("body").style.visibility = "hidden";
    log.trace("[EXIT]");
}

function setPageVisible() {
    log.trace("[START]");
    document.querySelector("body").style.visibility = "visible";
    log.trace("[EXIT]");
}

function setDisplayMode() {
    log.debug("DisplayMode : " + displayMode);

    switch(displayMode)
    {
        case "light" :
            log.debug("Selected mode : case::light");
            document.body.removeAttribute('data-theme', 'dark');
        break;

        case "dark" :
            log.debug("Selected mode : case::dark");
            document.body.setAttribute('data-theme', 'dark');
        break;

        default:
            if (window.matchMedia('(prefers-color-scheme: dark)').matches || autoDarkModeSimulation) {
                log.debug("Selected mode : default::dark");
                document.body.setAttribute('data-theme', 'dark');
            } else {
                log.debug("Selected mode : default::light");
                document.body.removeAttribute('data-theme', 'dark');
            }
    }
}

function setPageEvents() {
    log.trace("[START]");

    document.getElementById("sign_in").addEventListener("click", signIn);
    document.getElementById("list_file").addEventListener("click", listFile);
    document.getElementById("create_dir").addEventListener("click", createDir);
    document.getElementById("save_file").addEventListener("click", saveFile);
    document.getElementById("load_file").addEventListener("click", loadFile);
    document.getElementById("delete_file").addEventListener("click", deleteFile);

    let message = "This page is asking you to confirm that you want to leave - data you have entered may not be saved."
    let onBeforeUnload = function(event) {
        log.debug("TextNotes is stopping");
        log.debug("Page::BeforeUnloadEvent");

        if (window.errorOnPage) {
            log.fatal("Fatal error on the page!, onBeforeUnload()");
            return;
        }

        if (model.isChanged()) {
            log.debug("Page::BeforeUnloadEvent::Changed");
            model.save();
            event.returnValue = message
            event.preventDefault();

            return event.returnValue;
        } else {
            log.debug("Page::BeforeUnloadEvent::Not Changed");
        }
    }

    let onMouseLeave = function(event) {
        log.debug("Page::MouseLeave -> Saving data");

        if (window.errorOnPage) {
            log.fatal("Fatal error on the page!, onMouseLeave()");
            return;
        }

        if (model.isChanged()) {
            log.debug("Data changed : Saving");
            model.save();
        } else {
            log.debug("Data not changed : Not Saving");
        }
    }

    let onLostFocus = function(event) {
        log.debug("Page::LostFocus");

        if (window.errorOnPage) {
            log.fatal("Fatal error on the page!, onLostFocus()");
            return;
        }

        if (model.isChanged()) {
            log.debug("Data changed : Saving");
            model.save();
        } else {
            log.debug("Data not changed : Not Saving");
        }
    }

    let onStorageChanged = function(changes, area) {
        log.debug("Storage has changed");

        if (window.errorOnPage) {
            log.fatal("Fatal error on the page!, onStorageChanged()");
            return;
        }

        reloadModel();
    }

    let enableTextAreaEvent = function(event) {
        if (event.target.id !== "textArea") {
            return false;
        }
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("blur", onLostFocus)
    document.querySelector("body").addEventListener("mouseleave", onMouseLeave);
    document.querySelector("body").oncontextmenu = enableTextAreaEvent;

    io.setOnChanged(onStorageChanged);

    browser.runtime.onMessage.addListener((msg) => {
        log.trace("Message arrived : " + JSON.stringify(msg));

        if (window.errorOnPage) {
            log.fatal("Fatal error on the page!, onMessage()");
            return;
        }

        if (msg.hasOwnProperty("type") && msg["type"] === "new-note"
            && msg.hasOwnProperty("target") && msg["target"] === log.getTabId()) {
            if (msg.hasOwnProperty("text") && msg.hasOwnProperty("new")) {
                externalAddSelectedText(msg["text"], msg["new"]);
            } else {
                log.warning("Message was invalid : " + JSON.stringify(msg))
            }
        } else if (msg.hasOwnProperty("type") && msg["type"] === "google_oauth2_resp") {
            log.info("Message arrived : google_oauth2_resp");
            log.info("oauth2 access token :" + msg["token"]);
            oauth2_token = msg["token"];
            l("oauth2 token :\n" + oauth2_token);
        } else {
            log.trace("Message has arrived but the target is other tab or message type was invalid!");
        }
    });

    browser.notifications.onClosed.addListener(() => { log.debug("Notification closed!")});
    browser.notifications.onShown.addListener(() => { log.debug("Notification showed!")});

    log.trace("[EXIT]");
}

function setTextAreaEvents() {
    log.trace("[START]");

    let setCursorForOpenLink = (event) => {
        if ((event.key === "Control") && !document.getElementById("textArea").readOnly) {
            log.debug("[START]");
            let textArea = document.getElementById("textArea");
            textArea.classList.add("pointerCursor");
            textArea.addEventListener("keyup", clearCursorForOpenLink);
            textArea.removeEventListener("keydown", setCursorForOpenLink);
            log.debug("[EXIT]");
        }
    }

    let clearCursorForOpenLink = (event) => {
        log.debug("[START]");
        log.debug("Event :" + event.type);
        let textArea = document.getElementById("textArea");
        textArea.classList.remove("pointerCursor");
        textArea.removeEventListener("keyup", clearCursorForOpenLink);
        textArea.addEventListener("keydown", setCursorForOpenLink);
        textArea.removeEventListener("mouseup", openSelectedUrlInTextArea);
        textArea.removeEventListener("mousemove", openSelectedUrlInTextArea);
        log.debug("[EXIT]");
    }

    let textArea = document.getElementById("textArea");
    textArea.addEventListener("keydown", setCursorForOpenLink);
    textArea.addEventListener("mouseenter", clearCursorForOpenLink);
    textArea.addEventListener("mouseleave", clearCursorForOpenLink);

    let mouseDown = (event) => {
        if (event.buttons === 1 && event.ctrlKey && !textArea.readOnly) {
               log.debug("[START]");
               const waitForCursorMs = 100;
               let textArea = document.getElementById("textArea");
               if (! textArea.classList.contains("pointerCursor")) {
                   textArea.classList.add("pointerCursor");
                   textArea.addEventListener("keyup", clearCursorForOpenLink);
                   textArea.removeEventListener("keydown", setCursorForOpenLink);
               }
               textArea.selectionEnd = textArea.selectionStart;
               window.setTimeout(selectUrlInTextAreaAtCursor, waitForCursorMs);
        }
    }

    textArea.addEventListener("mousedown", mouseDown);

    textArea.oninput = textAreaChanged;
    textArea.onfocus = setTaskListFocusOut;
    textArea.addEventListener("keydown", keyDownEventsOnTextArea);

    log.trace("[EXIT]");
}

function selectUrlInTextAreaAtCursor() {
    log.debug("[START]")

    let urlRe = /^((http|https|ftp):\/\/?)[^\s()<>]+(?:\([\w\d]+\)|([^[:punct:]\s]|\/?))/;
    let wsRe = /\s/;

    let getIndexAtEndOfWord = (string, begin) => {
        log.trace("\tbegin :" + begin);
        let end = begin;
        for(;end < string.length && ! wsRe.test(string[end]);++end) {
            log.trace("\tend :" + end);
        }

        return end;
    };

    let textArea = document.getElementById("textArea");
    currentCursorPosition = textArea.selectionStart;
    let begin = currentCursorPosition;
    let end = getIndexAtEndOfWord(textArea.value, currentCursorPosition);
    let existingPattern = false;

    log.debug("Current :" + currentCursorPosition);
    log.debug("End : " + end);
    for(;begin >= 0 && !wsRe.test(textArea.value[begin]); --begin) {
        let result = textArea.value.substring(begin, end).match(urlRe);
        log.trace("Found :" + result);
        if (result != null && (result[0].length + begin > currentCursorPosition)) {
            log.debug("Result :" + result[0]);
            existingPattern = true;
            textArea.selectionStart = begin;
            textArea.selectionEnd = begin + result[0].length;
            textArea.addEventListener("mouseup", openSelectedUrlInTextArea);
            textArea.addEventListener("mousemove", openSelectedUrlInTextArea);
            break;
        }
    }

    log.debug("Existing pattern :" + existingPattern);
    log.debug("[EXIT]")
}

function openSelectedUrlInTextArea(event) {
    log.debug("[START]");

    let textArea = document.getElementById("textArea");
    textArea.removeEventListener("mouseup", openSelectedUrlInTextArea);
    textArea.removeEventListener("mousemove", openSelectedUrlInTextArea);

    if (event.type === "mouseup" && event.ctrlKey && !textArea.readOnly) {
        log.debug("MouseUp event");
        let selectedText = textArea.value.substring(textArea.selectionStart, textArea.selectionEnd);
        log.debug("Opening selected text : >>>" + selectedText + "<<<");

        let onCreated = (tab) => {
            log.debug("New tab has been created and id :`" + tab.id + "`");
        };

        let onError = (error) => {
            log.warning("Error occured while creating tab :" + error);
        }

        const activeWindow = !(event.getModifierState("CapsLock") || window.capslockonSimulation);
        if (activeWindow) {
            log.debug("Foreground window");
        } else {
            log.debug("Background window");
        }

        try {
            browser.tabs.create({ url: selectedText, active: activeWindow }).then(onCreated, onError);
        } catch(e) {
            log.debug("Exception occured!");
            onError(e);
        }

        textArea.selectionStart = currentCursorPosition;
        textArea.selectionEnd = textArea.selectionStart;
    } else {
        log.debug("Not MouseUp event");
    }

    log.debug("[EXIT]");
}

function setToolbarEvents() {
    log.trace("[START]");

    let disableEvent = function(event) {
        return false;
    }

    document.getElementById("addNoteIcon").onclick = addNoteAction;
    document.getElementById("addSeparatorIcon").onclick = addSeparatorAction;
    document.getElementById("deleteNoteIcon").onclick = deleteNoteAction;

    document.getElementById("addNoteIcon").onmousedown = disableEvent;
    document.getElementById("addSeparatorIcon").onmousedown = disableEvent;
    document.getElementById("deleteNoteIcon").onmousedown = disableEvent;
    document.getElementById("toolbarMenuIcon").onmousedown = openToolBarMenu;

    log.trace("[EXIT]");
}

function setDragBarEvents() {
    log.trace("[START]");

    let mouseMove = function(event) {
        setDragBarState(event.pageX);
        log.trace2("DragBar::MouseMove :" + event.pageX);
    }

    let removeMouseMove = function() {
        window.removeEventListener("mousemove", mouseMove);
        log.trace2("DragBar::MouseUp or MouseLeave");
    }

    window.onmouseup = removeMouseMove;
    document.querySelector("body").onmouseleave = removeMouseMove;

    document.getElementById("dragBar").onmousedown =
        function(event) {
            window.addEventListener("mousemove", mouseMove);
            log.trace2("DragBar::MouseDown");
        };

    log.trace("[EXIT]");
}

function setTaskListEvents() {
    log.trace("[START]");

    let taskListTop = document.getElementById("taskListTop");

    taskListTop.addEventListener("dragenter", dragEnter);
    taskListTop.addEventListener("drop", dragDrop);
    taskListTop.addEventListener("dragover", dragOver);

    let taskList = document.getElementById("taskList");

    taskList.onkeydown = keyDownEventsOnTaskList;
    taskList.oncontextmenu = contextmenuTaskList;

    taskList.onfocus = setTaskListFocusIn;
    taskList.onblur = setTaskListFocusOut;

    log.trace("[EXIT]");
}

function setTaskListFocusIn() {
    log.trace("[START]");
    document.getElementById(activeTaskItem).classList.remove("taskItemActiveFocusOut");
    document.getElementById("taskList").focus();
    log.trace("[EXIT]");
}

function setTaskListFocusOut() {
    log.trace("[START]");
    document.getElementById(activeTaskItem).classList.add("taskItemActiveFocusOut");
    log.trace("[EXIT]");
}

function setActiveItem(newActiveTaskItem) {
    log.debug("[START]");
    log.trace("activeTaskItem : " + activeTaskItem);
    log.trace("newActiveTaskItem :" + newActiveTaskItem);

    if (model.getLeaf(activeTaskItem) === undefined) {
        log.debug("activeTaskItem does not exist :" + activeTaskItem);
        activeTaskItem = model.trashbinId;
    }

    if (model.getLeaf(newActiveTaskItem) === undefined) {
        log.debug("newActiveTaskItem does not exist :" + newActiveTaskItem);
        newActiveTaskItem = model.trashbinId;
    }

    if (! openTrashbin && model.isInTrashbin(newActiveTaskItem)) {
        log.debug("newActiveTaskItem is in trashbin and trashbin is closed");
        newActiveTaskItem = model.trashbinId;
    }

    switchToNewContent(newActiveTaskItem);

    document.getElementById(activeTaskItem).classList.remove("taskItemActive", "taskItemActiveFocusOut");
    document.getElementById(newActiveTaskItem).classList.add("taskItemActive");

    activeTaskItem = newActiveTaskItem;

    setUIState("activeTaskItem", activeTaskItem);

    log.debug("[EXIT]");
}

function keyDownEventsOnTextArea(event) {
    if (event.key !== "Tab" || disableTabInTextArea) return;

    log.debug("[START]");
    log.trace("KeyDown event : " + event.key);
    log.trace("ShiftKey event : " + event.shiftKey);

    if (!event.shiftKey)
    {
        let textArea = document.getElementById("textArea");
        const tab = "\t";

        if (textArea.selectionDirection === "forward") {
            textArea.selectionStart = textArea.selectionEnd;
        } else {
            textArea.selectionEnd = textArea.selectionStart;
        }

        textArea.setRangeText(tab, textArea.selectionStart, textArea.selectionStart, "end");
        textAreaChanged();

        event.preventDefault();
    }

    log.debug("[EXIT]");
}

function keyDownEventsOnTaskList(event) {
    if (event.key === "Tab")  return;

    log.debug("[START]");
    log.debug("KeyDown event : " + event.key );
    log.debug("CtrlKey event : " + event.ctrlKey );

    switch (event.key) {
        case "ArrowUp":
        case "ArrowDown":
            moveActiveItem(event)
            break;

        case "Insert":
            if (event.ctrlKey) {
                addSeparatorAction();
            } else {
                addNoteAction();
            }
            break;

        case "Delete":
            deleteNoteAction();
            break;

        default:
            log.debug("No action was found for key :" + event.key);
    }

    log.debug("[EXIT]");
}

function moveActiveItem(event) {
    log.debug("[START]");

    let index = model.getIndexById(activeTaskItem);

    if (event.key === "ArrowUp") {
        --index;
    } else
    if (event.key === "ArrowDown") {
        ++index;
    } else {
        log.error("Unknown Key :" + event.key);
        return;
    }

    log.debug("New index :" + index);

    let newActiveItem = model.getRoot()[index];

    if (newActiveItem === undefined) {
        log.debug("Selected new item by index is >>>UNDEFINED<<<, skipping...")
        return;
    }

    if (document.getElementById(newActiveItem).classList.contains("hidden")) {
        log.debug("Selected new item by index is >>>HIDDEN<<<, skipping...")
        return;
    }

    log.debug("New ActiveItem : " + newActiveItem);

    setActiveItem(newActiveItem);

    log.debug("[EXIT]");
}

function saveContent(leafId) {
    log.trace("[START]");
    log.trace("leafId :" + leafId);

    model.setText(leafId, document.getElementById("textArea").value);

    setTaskName(leafId);

    log.trace("[EXIT]");
}

function loadContent(leafId) {
    log.debug("[START]");
    log.trace("leafId :" + leafId);

    let textArea = document.getElementById("textArea");
    let leaf = model.getLeaf(leafId);

    textArea.value = leaf.text;
    textArea.setSelectionRange(0, 0);

    log.debug("[EXIT]");
}

function switchToNewContent(leafId) {
    log.debug("[START]")
    log.trace("leafId :" +  leafId);

    let textArea = document.getElementById("textArea");

    if (model.getLeaf(leafId).type === "TRASHBIN" ||
        model.getLeaf(leafId).type === "SEPARATOR") {
        log.trace("Selected Item : trashbin or separator");;
        textArea.value = "";
        textArea.leafId = undefined;
        textArea.readOnly = true;
    } else {
        log.trace("Selected Item : real item");
        loadContent(leafId);
        textArea.leafId = leafId;
        textArea.readOnly = false;
    }

    log.debug("[EXIT]")
}

function clickOnTrashItem(arg) {
    log.debug("[START]")

    openTrashbin = !openTrashbin;

    setTrashbinArrow(arg.childNodes[3])

    let root = model.getRoot();
    let trashbinIndex = model.getIndexById(model.trashbinId);
    let inTrashbin = true

    for (let index = trashbinIndex + 1; index < root.length; ++index) {
        setTrashStateOfNote(document.getElementById(root[index]), inTrashbin);
    }

    setUIState("openTrashbin", openTrashbin);

    log.debug("[EXIT]")
}

function clickOnItem(arg) {
    log.debug("[START]")

    if (arg.button != 0) {
        log.trace("Nothing to do because it was not the left button");
        log.debug("[EXIT]")
        return;
    }

    log.trace("Click on item, id : " + arg.currentTarget.id);

    if (model.getLeaf(arg.currentTarget.id).type === "TRASHBIN") {
        clickOnTrashItem(arg.currentTarget);
    }

    setActiveItem(arg.currentTarget.id);

    log.debug("[EXIT]")
}

function addNoteAction() {
    log.debug("[START]");

    let leafId = model.addLeaf("ITEM", false);

    if ( -1 < model.getIndexById(activeTaskItem) && activeTaskItem != model.trashbinId &&
        !model.isInTrashbin(activeTaskItem))  {
        model.moveLeafAfterLeaf2(leafId, activeTaskItem);
    }

    updateTaskList();

    setActiveItem(leafId)

    log.debug("[EXIT]");
}

function addSeparatorAction() {
    log.debug("[START]");

    let leafId = model.addLeaf("SEPARATOR", false);

    if ( -1 < model.getIndexById(activeTaskItem) &&
        activeTaskItem != model.trashbinId &&
        ! model.isInTrashbin(activeTaskItem))  {
        model.moveLeafAfterLeaf2(leafId, activeTaskItem);
    }

    updateTaskList()

    setActiveItem(leafId)

    log.debug("[EXIT]");
}

function deleteNoteAction() {
    log.debug("[START]");

    if (activeTaskItem === model.trashbinId) {
        log.debug("Deleting trashbin, ignoring");
        log.debug("[EXIT]");
        return;
    }

    let leafId = activeTaskItem;
    let itemIndex = model.getIndexById(leafId);

    log.trace("leafId :" + leafId + ", itemIndex :" + itemIndex);

    if (itemIndex < 0)
    {
        log.error("LeafId does not exists in Root :" + leafId);
        return;
    }

    if (model.getLeaf(leafId) === undefined)
    {
        log.error("ID does not exist as a leaf :" + leafId);
        return;
    }

    if (itemIndex < model.getIndexById(model.trashbinId)) {
        log.trace("Item not in Trash");
        model.moveLeafToEnd(itemIndex);
    } else {
        log.trace("Item in Trash");
        model.delLeaf(leafId)
    }

    updateTaskList();

    itemIndex = Math.min(model.getRoot().length - 1, itemIndex);
    setActiveItem(model.getRoot()[itemIndex]);

    log.debug("[EXIT]");
}

function externalAddSelectedText(text, newNote)
{
    log.debug("[START]");
    log.trace("Text :" + text);
    log.trace("NewNote :" + newNote);

    let returnId;
    let topLeafId = model.getRoot()[0];
    let topLeaf = model.getLeaf(topLeafId);


    log.debug("topLeaf.type : " + topLeaf.type);
    if (newNote || topLeaf.type !== "ITEM") {
        log.debug("Adding to a new note");

        let newLeafId = model.addLeaf("ITEM", false, text.trim() + "\n");
        model.moveLeafAfterLeaf2(newLeafId, "taskListTop");
        updateTaskList()
        setActiveItem(newLeafId);
        model.save();

        const message = "Add selected text as a new note";
        const durationMs = 2000;
        showNotification(message, durationMs);

        returnId = newLeafId;
    } else {
        log.debug("Adding into the top note");

        let newText;

        if (0 ===  topLeaf.text.trimEnd().length) {
            newText = text.trim() + "\n";
        } else {
            newText = topLeaf.text.trimEnd() + "\n--------\n" + text.trim() + "\n";
        }

        model.setText(topLeafId, newText);

        updateTaskList()
        setActiveItem(topLeafId);
        model.save();

        const message = "Add selected text into the top note";
        const durationMs = 2000;
        showNotification(message, durationMs);

        returnId = topLeafId;
    }

    log.debug("[EXIT]");

    return returnId;
}

function textAreaChanged(event) {
    log.trace("[START]");

    let textArea = document.getElementById("textArea");

    if (textArea.leafId !== undefined) {
        saveContent(textArea.leafId);
    } else {
        log.warning("textArea.leafId is undefined");
    }

    log.trace("[EXIT]");
}

function dragStart(event) {
    log.debug("[START]");
    log.debug("Source : " + event.target.id);

    let type = model.getLeaf(event.target.id).type;

    event.dataTransfer.setData("tn_source_id", event.target.id);

    switch (type) {
        case "ITEM":
            log.debug("Type : ITEM");
            event.dataTransfer.setDragImage(event.target, 0, 0);
            break;

        case "SEPARATOR":
            log.debug("Type : SEPARATOR");
            event.dataTransfer.setDragImage(event.target, event.clientX / 4, 0);
            break;

        default:
            log.debug("Not supported type : '" + type + "', skipping");
            event.dataTransfer.clearData()
            return false;
    }

    event.target.classList.remove("taskItemActive");

    log.debug("[EXIT]");
}

function dragOver(event) {
    log.trace2("[START]");

    event.preventDefault();
    event.dataTransfer.dropEffect = "move"

    log.trace2("[EXIT]");
}

function dragEnter(event) {
    log.trace2("[START]");

    if (event.dataTransfer.getData("tn_source_id") !== undefined) {
        event.preventDefault();
    }

    log.trace2("[EXIT]");
}

function dragDrop(event) {
    log.debug("[START]");

    event.preventDefault();

    let source = event.dataTransfer.getData("tn_source_id");
    log.debug("Source :" + source + ", Destination :" + event.target.id);

    if (source !== undefined) {
        if (model.moveLeafAfterLeaf2(source, event.target.id)) {
            updateTaskList();
        }
    } else {
        log.warning("Unknown event");
    }

    log.debug("[EXIT]");
}

function dragEnd(event) {
    log.debug("[START]");

    setActiveItem(activeTaskItem);

    log.debug("[EXIT]");
}

function setDragBarState(pageX = 300) {
    log.trace2("[START]");

    let limit = 100;

    if (pageX < limit) {
        log.trace2("Bad dragbar position, too low value (<" + limit + "):" + pageX);
        pageX = limit;
    }

    if (pageX > window.screen.width - limit)  {
        log.trace2("Bad dragbar position, too high value (>screenX - " + limit + "):" + pageX);
        pageX = window.screen.width - limit;
    }

    let dragBarWidth = 9;
    let left = pageX + "px";
    let width = "calc(100% - " + (pageX + dragBarWidth) + "px)";

    document.getElementById("taskList").style.width = left;
    document.getElementById("dragBar").style.left = left;
    document.getElementById("textArea").style.width = width;

    setUIState("DragBarState_PageX", pageX);

    log.trace2("[EXIT]");
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

function contextmenuTaskList(event) {
    log.debug("[START]");

    event.preventDefault();

    setActiveItem(event.target.id);

    if (activeTaskItem === model.trashbinId) {
        contextmenuTrashbin(event);

        log.debug("[EXIT]");
        return;
    }

    let items =
        [{
            title: 'New Note',
            icon: 'newNoteIconMenu',
            fn: addNoteAction
        }, {
            title: 'New Separator',
            icon: 'newSeparatorIconMenu',
            fn: addSeparatorAction
        }, {
            title: 'Delete',
            icon: 'deleteNoteIconMenu',
            fn: deleteNoteAction
        }]

    basicContext.show(items, event)

    log.debug("[EXIT]");
}

function contextmenuTrashbin(event) {
    log.debug("[START]");

    let emptyTrash = function() {
        model.removeLeavesAfterTrash();
        updateTaskList();
        setActiveItem(model.trashbinId);
    }

    let items =
        [{
            title: 'Empty Trash',
            fn: emptyTrash,
            icon: 'emptyTrashIconMenu',
        }]

    basicContext.show(items, event)

    log.debug("[EXIT]");
}

function openToolBarMenu(event) {
    log.debug("[START]");

    let items =
        [{
            title: 'Preferences',
            fn : openPreferenceDialog,
            icon: 'preferenceIconMenu'
        }, {
            title: 'Help',
            fn : openHelpDialog,
            icon: 'helpIconMenu'
        }, {
            type:  'separator',
        }, {
            title: 'About',
            fn : openAboutDialog,
            icon: 'aboutIconMenu'
        }];

    basicContext.show(items, event)

    log.debug("[EXIT]");
}

function openPreferenceDialog() {
    let title = "Preferences";
    let source = "page/dialogs/preferences/preferences.html";
    let width = 650;
    let height = 280;

    model.save();
    dialog.show(title, source, width, height);
}

function openHelpDialog() {
    let title = "Help";
    let source = "page/dialogs/help/help.html"
    let width = 770;
    let height = 600;

    dialog.show(title, source, width, height);
}

function openAboutDialog() {
    let title = "About";
    let source = "page/dialogs/about/about.html"
    let width = 400;
    let height = 255;

    dialog.show(title, source, width, height);
}

async function showNotification(message, durationMs) {
    log.trace("[START]");
    log.trace("message :" + message + ", duration :" + durationMs);

    const notificationId = "TextNotesNotification";

    let clearNotification = async function() {
        log.trace("[START]");

        window.clearTimeout(notificationTimerId);
        log.trace("Removed timer, notificationTimerId :" + notificationTimerId);

        try {
            let all = await browser.notifications.getAll();
            log.trace("All :" + JSON.stringify(all));
            if (Object.keys(all).length > 0) {
                log.trace("Remove notification!");
                await browser.notifications.clear(notificationId);
            }
        } catch(e) {
            log.error("Some error occured :" + e);
        }

        log.trace("[EXIT]");
    };

    await clearNotification();

    try {
        let notificationOptions = { "type": "basic", "title": "TextNotes", "message": message };
        await browser.notifications.create(notificationId, notificationOptions);
        log.trace("Notification has been created!");
    } catch(e) {
        log.error("Some error occured :" + e);
    }

    notificationTimerId = window.setTimeout(clearNotification, durationMs);
    log.trace("Added new timer, notificationTimerId :" + notificationTimerId);

    log.trace("[EXIT]");
}

function l(text) {
    const pad = (n, length) => { return (String("0").repeat(length) + n).slice(-length); }

    let topLeafId = model.getRoot()[0];
    let topLeaf = model.getLeaf(topLeafId);

    let now = new Date();
    let time = pad(now.getHours(), 2) + ":" + pad(now.getMinutes(), 2) + ":" + pad(now.getSeconds(), 2) + "." +
               pad(now.getMilliseconds(), 3);

    const newText = "-------- " + time + "\n" + text.trimEnd() + "\n\n" + topLeaf.text.trim() + "\n";

    model.setText(topLeafId, newText);

    updateTaskList()
    setActiveItem(topLeafId);
    model.save();
}

async function showResponse(response) {
    const status = response.status;
    const statusText = response.statusText;
    const responseText = await response.text();

    l("Response : " + status + " " + statusText + " : " + responseText);

    return { status:status, statusText:statusText, responseText:responseText};
}

function signIn() {
    let message = { type: "google_oauth2" };
    browser.runtime.sendMessage(message);
}

var oauth2_token = "";
var folderId = "";
const TIMEOUT_MS = 1000;

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

async function fetchWithTimeout(resource, options = Object()) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  options.signal = controller.signal;
  const response = await fetch(resource, options);

  clearTimeout(id);

  return response;
}

async function createDir() {
    const getFolderList = async () => {
        let headers = new Headers();
        headers.append('Authorization', 'Bearer ' + oauth2_token);

        const query = "?q=mimeType%3D%27application%2Fvnd.google-apps.folder%27";
        let response = await fetch(new Request(DRIVE_API + "/files" + query, { method: "GET", headers : headers }));
        let resp = await showResponse(response);

        return JSON.parse(resp.responseText).files;
    };

    const createFolder = async () => {
        let headers = new Headers();
        headers.append('Authorization', 'Bearer ' + oauth2_token);
        headers.append('Accept', 'application/json');
        headers.append('Content-Type', 'application/json');

        let data = '{ "name": ".TextNotes", "mimeType" : "application/vnd.google-apps.folder" }';

        let response = await fetch(new Request(DRIVE_API + "/files", { method:"POST", headers:headers, body:data }));
        await showResponse(response);
    };

    let folders = await getFolderList();

    if  (0 === folders.length) {
        l("There is no existing folder");
        await createFolder();
        folders = await getFolderList();
    } else {
        l("There is an existing folder");
    }

    folderId = folders[0].id;
    l("FolderId : " + folderId);
}

async function listFile() {
    let headers = new Headers();
    headers.append('Authorization', 'Bearer ' + oauth2_token);

    const query = "?q='" + folderId + "' in parents";

    let response = await fetchWithTimeout(new Request(DRIVE_API + "/files" + query,
                                          { method: "GET", headers : headers }));
    showResponse(response);
}

async function saveFile() {
    let data = model.exportDataAsText();
    let headers = new Headers();
    headers.append('Authorization', 'Bearer ' + oauth2_token);
    headers.append('Content-Type', "text/plain")
    headers.append('Content-Length', data.length)

    let response = await fetch(new Request(DRIVE_UPLOAD_API + "/files?uploadType=media",
                              { method:"POST", headers:headers, body:data }));
    let resp = await showResponse(response);
    const id = JSON.parse(resp.responseText).id;

    headers = new Headers();
    headers.append('Authorization', 'Bearer ' + oauth2_token);
    headers.append('Accept', 'application/json');
    headers.append('Content-Type', 'application/json');

    data = '{"contentRestrictions":[{"readOnly":true}],"description":"TextNotes", "name":"' + new Date().getTime() +
           '" }';

    let query = "/files/" + id + "?addParents=" + folderId
    response = await fetch(new Request(DRIVE_API + query, { method:"PATCH", headers:headers, body:data }));
    showResponse(response);
}

async function loadFile() {
    const fileId = prompt("What is the fileId?");

    let headers = new Headers();
    headers.append('Authorization', 'Bearer ' + oauth2_token);

    const query = "/files/" + fileId + "?alt=media"
    let response = await fetch(new Request(DRIVE_API + query, { method: "GET", headers : headers }));
    await showResponse(response);
}

async function deleteFile() {
    const fileId = prompt("What is the fileId?");

    let headers = new Headers();
    headers.append('Authorization', 'Bearer ' + oauth2_token);

    const query = "/files/" + fileId;
    let response = await fetch(new Request(DRIVE_API + query, { method: "DELETE", headers : headers }));
    await showResponse(response);
}

window.onload = initTextNotes;
