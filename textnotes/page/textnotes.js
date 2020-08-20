"use strict";

var log = null;
var io = null;
var model = null;
var dialog = null;

var activeTaskItem = null;
var openTrashbin = null;

var disableTabInTextArea = false;

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

    document.title = "TextNotes";

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
    newVersionMessage();
    registerPage();

    log.info("TextNotes started");

    log.debug("[EXIT]");
    }

function registerPage() {
    log.debug("[START]");

    let message = { type: "register", command : "add", tabId : log.getTabId() };

    browser.runtime.sendMessage(message).then(
        ()    => { log.debug("Registration was successful!") },
        (msg) => { log.error("Error while registering the page :" + msg) });

    log.debug("[EXIT]");
}

function unregisterPage() {
    log.debug("[START]");

    let message = { type: "register", command : "del", tabId : log.getTabId() };

    browser.runtime.sendMessage(message).then(
        ()    => { log.debug("Unregistration was successful!") },
        (msg) => { log.error("Error while registering the page :" + msg) });

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

    log.debug("[EXIT]");
}

function update() {
    log.debug("[START]");

    setPageHidden();
    updateTaskList();
    setActiveItem(activeTaskItem);
    model.resetChanged();
    setPageVisible();
    document.getElementById("taskList").focus();

    log.debug("[EXIT]");
}

function newVersionMessage()
{
    let welcomeMessage =
              "Thanks for using TextNotes!\n\n"
            + "New things in version 1.5 :\n";

    welcomeMessage +=
              "- Export data to text file\n"
            + "- Minor bug fixes\n"

    welcomeMessage +=
            "\nif you find a bug, please report it to me :\ngabor.shepherd.work@gmail.com"

    let getHandler = (messageVersion) => {
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

function setPageEvents() {
    log.trace("[START]");

    let message = "This page is asking you to confirm that you want to leave - data you have entered may not be saved."
    let onBeforeUnload = function(event) {
        log.debug("TextNotes is stopping");
        log.debug("Page::BeforeUnloadEvent");

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
        if (model.isChanged()) {
            log.debug("Data changed : Saving");
            model.save();
        } else {
            log.debug("Data not changed : Not Saving");
        }
    }

    let onStorageChanged = function(changes, area) {
        log.debug("Storage has changed");
        reloadModel();
    }

    let enableTextAreaEvent = function(event) {
        if (event.target.id !== "textArea") {
            return false;
        }
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("unload", unregisterPage);
    document.querySelector("body").addEventListener("mouseleave", onMouseLeave);
    document.querySelector("body").oncontextmenu = enableTextAreaEvent;

    io.setOnChanged(onStorageChanged);

    browser.runtime.onMessage.addListener((msg) => {
        log.trace("Message arrived : " + JSON.stringify(msg));

        if (msg.hasOwnProperty("type") && msg["type"] === "new-note"
            && msg.hasOwnProperty("target") && msg["target"] === log.getTabId()) {
            if (msg.hasOwnProperty("text")) {
                externalAddNoteAction(msg["text"]);
            } else {
                log.warning("Message was invalid : " + JSON.stringify(msg))
            }
        } else {
            log.trace("Message has arrived but the target is other tab or message type was invalid!");
        }
    });

    log.trace("[EXIT]");
}

function setTextAreaEvents() {
    log.trace("[START]");

    let textArea = document.getElementById("textArea");
    textArea.oninput = textareaChanged;
    textArea.onfocus = setTaskListFocusOut;
    textArea.onkeydown = keyDownEventsOnTextArea;

    log.trace("[EXIT]");
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
        const fakeTab = "    ";
        const start = document.activeElement.selectionStart
        const end = document.activeElement.selectionEnd;

        document.getElementById("textArea").setRangeText(fakeTab, start, end, "end");
        textareaChanged();

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

function externalAddNoteAction(text)
{
    log.debug("[START]");
    log.trace("Text :" + text);

    let leafId = model.addLeaf("ITEM", false, text);
    model.moveLeafAfterLeaf2(leafId, "taskListTop");

    updateTaskList()

    setActiveItem(leafId);

    const oldTitle = document.title;
    const newTitle = "New Note - " + oldTitle;
    document.title = newTitle;

    setTimeout( () => { document.title = oldTitle; }, 2000);

    log.debug("[EXIT]");

    return leafId;
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

function textareaChanged(event) {
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
            let image = new Image();
            // image.src = "../icons/separator.png"
            event.dataTransfer.setDragImage(image, event.clientX, 0);
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
    let height = 215;

    model.save();
    dialog.show(title, source, width, height);
}

function openHelpDialog() {
    let title = "Help";
    let source = "page/dialogs/help/help.html"
    let width = 770;
    let height = 520;

    dialog.show(title, source, width, height);
}

function openAboutDialog() {
    let title = "About";
    let source = "page/dialogs/about/about.html"
    let width = 400;
    let height = 255;

    dialog.show(title, source, width, height);
}

window.onload = initTextNotes;
