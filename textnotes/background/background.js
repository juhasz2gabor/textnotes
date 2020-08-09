"use strict";

let log = null;
let tabs = null;


function createContextMenu() {
    log.trace("[START]");

    browser.contextMenus.create({
        id: "textnotes",
        title: "TextNotes",
        contexts: ["all"],
        icons: {
            "16": "icons/textnotes.svg",
            "32": "icons/textnotes.svg"
        }
    });

    browser.contextMenus.onClicked.addListener(
        (info) => {
            if (info.menuItemId == "textnotes") {
                onClickedOnIcon();
            }
        }
    )

    log.trace("[EXIT]");
}

async function existingTab(windowId) {
    log.trace("[START]");
    log.trace("windowId :" + windowId);

    let returnValue = false;

    for (let value of tabs) {
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

async function onClickedOnIcon(_, clickData) {
    log.debug("[START]");
    log.debug("Opening a new TextNotes page");

    try {
        let textNotesURL = browser.extension.getURL("page/textnotes.html");
        let newWindow = (clickData !== undefined) && (clickData.modifiers.includes("Ctrl"));

        if (newWindow) {
            await browser.windows.create({ url: textNotesURL, type: "popup", state: "maximized" });
            log.debug("New window has been created");
        } else {
            let currentWindow = await browser.windows.getCurrent();
            let existingTabId = await existingTab(currentWindow.id);

            if (Number.isInteger(existingTabId)) {
                log.debug("There is already a tab on this window, id :`" +
                    currentWindow.id + ":" + existingTabId + "`");

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

async function onCommand(command) {
    log.debug("[START]");
    log.debug("command :" + command);

    if (command === "open-textnotes-tab") {
        onClickedOnIcon();
    } else if (command === "open-textnotes-popup") {
        onClickedOnIcon("", { modifiers : ["Ctrl"] });
    } else {
        log.error("Unknown commands : " + command);
    }

    log.debug("[EXIT]");
}

function onMessage(message) {
    log.debug("[START]");

    if (message.hasOwnProperty("command") && message.hasOwnProperty("tabId")) {
        switch(message.command) {
            case "add" :
                log.debug("Command :'add', tabId :" + message.tabId);
                tabs.add(message.tabId);
                break;

            case "del" :
                log.debug("Command :'del', tabId :" + message.tabId);
                tabs.delete(message.tabId);
                log.debug("Tab has been removed, tabId :" + message.tabId);
                break;

            default :
            log.warning("Unknown command :" +  message.command);
        }
    } else {
        log.warning("Unknown message!")
    }
    log.debug("TabIds : [ " + Array.from(tabs).join(', ') + " ]");

    log.debug("[EXIT]");
}

async function initBackground() {
    log = await Logger.create(true);
    log.debug("[START]");

    tabs = new Set();
    createContextMenu();
    browser.browserAction.onClicked.addListener(onClickedOnIcon);
    browser.commands.onCommand.addListener(onCommand);
    browser.runtime.onMessage.addListener(onMessage);

    log.info("Background has been initialized succesfully, version :" + browser.runtime.getManifest().version);
    log.debug("[EXIT]");
}

window.onload = initBackground;
