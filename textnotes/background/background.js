"use strict";

let log = null;
let textnotesTabIds = null;
let textNotesURL = "";

const itemTextNotes = "textnotes";
const itemAddText = "textnotes-selection"

function createContextMenu() {
    log.trace("[START]");

    browser.contextMenus.create({
        id: itemTextNotes,
        title: "TextNotes",
        contexts: ["all"],
        icons: {
            "16": "icons/textnotes.svg",
            "32": "icons/textnotes.svg"
        }
    });

    browser.contextMenus.create({
        id: itemAddText,
        title: "Add Selected Text to TextNotes",
        contexts: ["selection"],
        icons: {
            "16": "icons/textnotes.svg",
            "32": "icons/textnotes.svg"
        }
    });

    browser.contextMenus.onClicked.addListener(
        (info) => {
            switch(info.menuItemId)
            {
                case itemTextNotes:
                    startTextNotes();
                break;

                case itemAddText:
                    const secondaryButton = 2;
                    addSelectedText(info.selectionText, info.button !== secondaryButton);
                break;

                default:
                    log.warning("Unknown menuItemId :" + info.menuItemId);
            }
        }
    )

    log.trace("[EXIT]");
}

async function existingTab(windowId) {
    log.trace("[START]");
    log.trace("windowId :" + windowId);

    let returnValue = false;
    for (let value of textnotesTabIds) {
        log.trace("Checking tabId : " + value);
        try {
            let tab = await browser.tabs.get(value);

            if (tab.windowId === windowId) {
                returnValue = tab.id;
                break;
            }
        } catch (e) {
            log.error("Some error occurred while getting tabInfo :" + e);
        }
    }

    log.trace("[EXIT]");

    return returnValue;
}

async function startTextNotes(_, clickData) {
    log.debug("[START]");
    log.debug("Opening a new TextNotes page");

    try {
        let newWindow = (clickData !== undefined) && (clickData.modifiers.includes("Ctrl"));

        if (newWindow) {
            await browser.windows.create({ url: textNotesURL, type: "popup", state: "maximized" });
            log.debug("New window has been created");
        } else {
            let currentWindow = await browser.windows.getCurrent();
            let existingTabId = await existingTab(currentWindow.id);

            if (Number.isInteger(existingTabId)) {
                log.debug("There is already a tab on this window, id :`" + currentWindow.id + ":" + existingTabId + "`");

                browser.tabs.update(existingTabId, { active: true });
            } else {
                log.debug("There is no tab on this window");

                let newTab = await browser.tabs.create({ url: textNotesURL });
                log.debug("New tab has been created, id :`" + currentWindow.id + ":" + newTab.id + "`");
            }
        }
    } catch (e) {
        log.error("Page can not be created or updated :" + e);
    }

    log.debug("[EXIT]");
}

async function addSelectedText(text, newNote) {
    log.debug("[START]");

    if (textnotesTabIds.size === 0) {
        log.debug("There is no existing TextNotes.")
        let currentWindow = await browser.windows.getCurrent();
        let newTab = await browser.tabs.create({ url: textNotesURL, active: false });
        log.debug("New tab has been created in background, id :`" + currentWindow.id + ":" + newTab.id + "`");
    }

    const timeoutSec = 5;
    addSelectedText2(text, newNote, timeoutSec);

    log.debug("[EXIT]");
}

function addSelectedText2(text, newNote, timeoutSec) {
    log.debug("[START]");

    if (timeoutSec === 0) {
        log.error("TextNotes does not start I am giving up!")
        return;
    }

    if (textnotesTabIds.size === 0) {
        log.debug("Waiting for TextNotes, timeout :" + timeoutSec);
        setTimeout( ()=>{ addSelectedText2(text, newNote, timeoutSec-1); }, 1000);
    } else {
        log.debug("Selected Text :" + text);
        log.debug("New note :" + newNote);
        let msg = { target: Array.from(textnotesTabIds)[0], type: "new-note", text: text, new: newNote };
        log.debug(JSON.stringify(msg));

        try {
            browser.runtime.sendMessage(msg).then(
                () => { log.debug("Sending 'new-note' command was successful.")},
                (error) => { log.error("Error while sending 'new-note' command : " + error); });
        } catch(e) {
            log.debug("Exception occured!");
            log.error("Error while sending 'new-note' command : " + e);
        }
    }

    log.debug("[EXIT]");
}

async function onCommand(command) {
    log.debug("[START]");
    log.debug("command :" + command);

    switch(command)
    {
        case "open-textnotes-tab" :
            startTextNotes();
        break;

        case "open-textnotes-popup" :
            startTextNotes("", { modifiers : ["Ctrl"] });
        break;

        default:
            log.error("Unknown commands : " + command);
    }

    log.debug("[EXIT]");
}

function onMessage(message) {
    log.debug("[START]");

    if (message.hasOwnProperty("type") && message["type"] === "register" && message.hasOwnProperty("command") &&
        message.hasOwnProperty("tabId")) {
        switch(message.command) {
            case "add" :
                log.debug("Command :'add', tabId :" + message.tabId + ", " + typeof(message.tabId));
                textnotesTabIds.add(message.tabId);
                break;

            default :
                log.warning("Unknown command :" +  message.command);
        }
    } else {
        log.warning("Unknown message!")
    }
    log.debug("TabIds : [ " + Array.from(textnotesTabIds).join(', ') + " ]");

    log.debug("[EXIT]");
}

function onUpdatedTab(tabId, changeInfo, tab) {
    if (textnotesTabIds.has(tabId) && changeInfo.hasOwnProperty("status")) {
        log.debug("Tab has been removed, tabId :`" + tabId + "`");
        textnotesTabIds.delete(tabId);
    }
}

function onRemovedTab(tabId) {
    if (textnotesTabIds.has(tabId)) {
        log.debug("Tab has been removed, tabId :`" + tabId + "`");
        textnotesTabIds.delete(tabId);
    }
}

function setContextMenuItem(info)
{
    log.debug("[START]");
    log.trace("contexts :" + info.contexts);

    if (info.contexts.includes("selection")) {
        log.debug("Existing selection context -> hiding TextNotes launcher item");
        browser.contextMenus.update(itemTextNotes, { visible: false });
    } else {
        log.debug("No selection -> showing TextNotes launcher item");
        browser.contextMenus.update(itemTextNotes, { visible: true });
    }

    browser.contextMenus.refresh();

    log.debug("[EXIT]");
}

async function initBackground() {
    log = await Logger.create(true);
    log.debug("[START]");

    textnotesTabIds = new Set();
    textNotesURL = browser.runtime.getURL("page/textnotes.html");
    log.debug("textNotesUrl : " + textNotesURL);

    createContextMenu();
    browser.browserAction.onClicked.addListener(startTextNotes);
    browser.commands.onCommand.addListener(onCommand);
    browser.runtime.onMessage.addListener(onMessage);
    browser.contextMenus.onShown.addListener(setContextMenuItem);
    browser.tabs.onUpdated.addListener(onUpdatedTab);
    browser.tabs.onRemoved.addListener(onRemovedTab);

    log.info("Background has been initialized succesfully, version :" + browser.runtime.getManifest().version);
    log.debug("[EXIT]");
}

window.onload = initBackground;
