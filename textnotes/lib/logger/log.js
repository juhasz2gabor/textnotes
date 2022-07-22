"use strict";

class Logger {
    constructor(pageId, logLevel, windowId, tabId) {
        this._logLevel = Logger.Severity[logLevel];
        this._pageId = pageId;
        this._windowId = windowId;
        this._tabId = tabId;

        if (this._logLevel === undefined) {
            this._logLevel = Logger.Severity["INFO"];
        }
    }

    _pad(n, length) {
        return (String("0").repeat(length) + n).slice(-length);
    }

    _logEntry(severity, message) {
        if (this._logLevel < Logger.Severity[severity]) {
            return;
        }

        let now = new Date();
        let time = this._pad(now.getHours(), 2) + ":" +
            this._pad(now.getMinutes(), 2) + ":" +
            this._pad(now.getSeconds(), 2) + "." +
            this._pad(now.getMilliseconds(), 3);

        let caller = Error().stack.split(/\r\n|\n/)[2];
        let func = caller.split("@")[0];
        let place = caller.split("/").slice(-1)[0];

        let entry = "[TextNotes]" +
            " " + time + " " +
            "`" + this._pageId + "` " +
            (severity + "         ").slice(0, 8) +
            message +
            ", " + func + "()";

        let fillerSize = Logger.RightAlignSize - entry.length - place.length;

        if (fillerSize > 0) {
            entry += String(" ").repeat(fillerSize)
        }

        entry += " [" + place + "]";

        if (Logger.Severity[severity] <= Logger.Severity["ERROR"]) {
            console.error(entry);
        } else {
            console.log(entry);
        }

        window.dump(entry + "\n");
    }

    getId() {
        return this._pageId;
    }

    getWindowId() {
        return this._windowId;
    }

    getTabId() {
        return this._tabId;
    }

    getSeverityList() {
        return Logger.Severity;
    }

    getLogLevelInStorage() {
        return Logger.getLogLevel();
    }

    getLogKey() {
        return Logger.LogKey;
    }

    fatal(message) {
        this._logEntry("FATAL", message);
    }

    error(message) {
        this._logEntry("ERROR", message);
    }

    warning(message) {
        this._logEntry("WARNING", message);
    }

    info(message) {
        this._logEntry("INFO", message);
    }

    debug(message) {
        this._logEntry("DEBUG", message);
    }

    trace(message) {
        this._logEntry("TRACE", message);
    }

    trace2(message) {
        this._logEntry("TRACE2", message);
    }
}

Logger.LogKey = "TextNotes_LogLevel";
Logger.Severity = {
    FATAL: 0,
    ERROR: 1,
    WARNING: 2,
    INFO: 3,
    DEBUG: 4,
    TRACE: 5,
    TRACE2 : 6
};
Logger.RightAlignSize = 105;

Logger.getLogLevel = async function() {
    let key = Logger.LogKey;
    let result;
    let defaultLevel = browser.runtime.getManifest().version_name;

    if (defaultLevel === undefined) {
        defaultLevel = "INFO";
    }

    try {
        result = await browser.storage.local.get(key);
        result = result.hasOwnProperty(key) ? result[key] : defaultLevel;
    } catch (e) {
        console.error(e);
        result = defaultLevel;
    }

    return result;
}

Logger.setLogLevel = async function(value) {
    let key = Logger.LogKey;
    let item = {
        [key]: value
    };

    try {
        await browser.storage.local.set(item);
    } catch (e) {
        return e;
    }

    return true;
}

Logger.create = async function (noTabInfo = false, prefix = "") {
    let tabId;
    let windowId;

    if (noTabInfo) {
        tabId = "bg";
        windowId = "bg";
    } else {
        try {
            let tab = await browser.tabs.getCurrent();
            tabId = tab.id;
            windowId = tab.windowId;
        } catch (e) {
            console.error(e);
            tabId = "??";
            windowId = "??";
        }
    }

    let tabIdWithPrefix = (prefix === "") ? tabId : prefix + tabId;
    let pageId = prefix + windowId + ":" + tabId;
    let logLevel = await Logger.getLogLevel();

    return new Logger(pageId, logLevel, windowId, tabIdWithPrefix);
}
