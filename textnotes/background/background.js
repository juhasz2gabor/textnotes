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
                log.debug("Command :'add', tabId :" + message.tabId);
                textnotesTabIds.add(message.tabId);
                break;

            default :
                log.warning("Unknown command :" +  message.command);
        }
    } else if (message.hasOwnProperty("type") && message["type"] === "google_oauth2") {
        log.info("Message arrived : google_oauth2");
        doOAuth2();
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
    textNotesURL = browser.extension.getURL("page/textnotes.html");
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

const clientID = "350613416742-2afpkvegna66mknm83lr8h9ejfdpsor8.apps.googleusercontent.com";

function doOAuth2() {
    const redirectURL = "http://127.0.0.1/mozoauth2/89991568f53933d0e093c132d15a050bd7513b79"
    const scope = "https://www.googleapis.com/auth/drive.file"
    let authURL = "https://accounts.google.com/o/oauth2/v2/auth";
    authURL += `?client_id=${clientID}`;
    authURL += `&response_type=token`;
    authURL += `&redirect_uri=${encodeURIComponent(redirectURL)}`;
    authURL += `&scope=${encodeURIComponent(scope)}`;

    log.info("authURL : " + authURL);

    try {
        browser.identity.launchWebAuthFlow({ interactive: true, url: authURL })
            .then(doOAuth2_2, (e) => { log.error("launchWebAuthFlow : " + e)});
    } catch(e) {
        log.error("exception : launchWebAuthFlow : " + e);
    }
}

function doOAuth2_2(redirectUri) {
    log.info("Redirect URI : " + redirectUri);

      let m = redirectUri.match(/[#?](.*)/);
      if (!m || m.length < 1) {
          log.error("redirect URI format is not valid!");
      } else {
          let access_token = new URLSearchParams(m[1].split("#")[0]).get("access_token");
          log.info("access_token : " + access_token);
          if (!access_token) {
              log.error("'access_token' parameter does not exist!")
          } else {
              const validationURL = 'https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' + access_token;
              const validationRequest = new Request(validationURL, { method: "GET" });

              try {
                  const callback = (response) => {
                      if (!response.ok) {
                          log.error("Validation was not successful : " + response.status + " " + response.statusText);
                      } else {
                          const jsonCallback = (json) => {
                              log.info("Response : " + JSON.stringify(json));
                              if (json.aud && json.aud === clientID) {
                                  doOAuth2_3(access_token);
                              } else {
                                  log.error("Validation was not successful");
                              }
                          };

                          response.json().then(jsonCallback);
                      }
                  };

                  fetch(validationRequest).then(callback);

              } catch(e) {
                  log.error("Some error occured while validating token :" + e);
              }
          }

      }
}

function doOAuth2_3(access_token) {
    log.info("Validation was successful, access_token : " + access_token);

    try {
        let message = { type: "google_oauth2_resp", token: access_token };
        browser.runtime.sendMessage(message).then(
            () => { },
            (error) => { log.error("Error while sending google_oauth2_resp : " + error); });
    } catch(e) {
        log.debug("Exception occured!");
        log.error("Error while sending google_oauth2_resp : " + e);
    }
}



async function showResponse(response) {
    log.info("Response : " + response.status + " " + response.statusText + " : " + await response.text());
}

async function XXXdoOAuth2_3(access_token) {
    log.info("Validation was successful, access_token : " + access_token);

    let response;

    const headers = new Headers();
    headers.append('Authorization', 'Bearer ' + access_token);

    try {
        // Create a file
        const data = '{ "text" : "Hello World!" }'
        h1 = headers.clone();
        h1.append("Content-Type", "text/plain");

        response = await fetch(new Request(DRIVE_API + "/files?uploadType=media",
                                           { method:"POST", headers:headers, body:data }));
        showResponse(response);

        // List files
        response = await fetch(new Request(DRIVE_API + "/files", { method: "GET", headers : headers }));
        showResponse(response);
    } catch(e) {
        log.error("Some error occured while using driver API : " + e);
    }
}

window.onload = initBackground;
