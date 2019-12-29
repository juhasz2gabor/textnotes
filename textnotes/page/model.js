"use strict";

class Model {

    constructor() {
        log.trace("[START]");

        this.trashbinId = "trashbin";
        this._saveDataDelay = 5 * 1000;
        this._saveDataTimer = null;
        this._textExportVersion = "0.1";

        this._resetState();

        log.trace("[EXIT]");
    }

    _resetState() {
        log.trace("[START]");

        this._version = browser.runtime.getManifest().version;
        this._root = new Array();
        this._leaves = new Object();
        this._uistate = new Object();

        this.addLeaf("TRASHBIN", true, "", this.trashbinId, false);

        log.trace("[EXIT]");
    }

    _setState(data) {
        log.trace("[START]");

        this._version = data.version;
        this._root = data.root;
        this._leaves = data.leaves;
        this._uistate = data.uistate;

        log.trace("[EXIT]");
    }

    _getState() {
        log.trace("[START]");

        let data = {
            version: this._version,
            root: this._root,
            leaves: this._leaves,
            uistate: this._uistate
        };

        log.trace("[EXIT]");

        return data;
    }

    _createLeaf(type, text) {
        return {
            type: type,
            text: text
        };
    }

    getVersion() {
        return this._version;
    }

    isChanged() {
        return this._saveDataTimer !== null;
    }

    setChanged() {
        log.trace("[START]");

        let delay = this._saveDataDelay;

        this.resetChanged();
        this._saveDataTimer = window.setTimeout(() => {
                                  log.debug("Timeout -> Saving data");
                                  this.save()
                              }, delay);

        log.trace("[EXIT]");
    }

    resetChanged() {
        log.trace("[START]");

        if (this.isChanged()) {
            window.clearTimeout(this._saveDataTimer);
            this._saveDataTimer = null;
        }

        log.trace("[EXIT]");
    }

    getUIState() {
        return this._uistate;
    }

    setUIState(uistate) {
        log.trace2("[START]");

        this._uistate = uistate;
        this.setChanged();

        log.trace2("[EXIT]");
    }

    getUniqueId() {
        let id = new Date().getTime();

        while (id === new Date().getTime());

        return id;
    }

    getRoot() {
        return this._root;
    }

    addLeaf(type, inTrashbin, text = "", id = 0, markChanged = true) {
        log.trace("[START]");
        log.trace2("type :" + type + ", inTrashbin : " + inTrashbin + ", text :" +
                    text + ", id :" + id  + ", markChanged :" + markChanged);

        if (id === 0) {
            id = this.getUniqueId();
        }

        id = id.toString();

        if (this._leaves[id] !== undefined) {
            log.error("ID already existing :" + id);
            return;
        }

        this._leaves[id] = this._createLeaf(type, text);

        if (inTrashbin) {
            log.trace2("inTrashbin");
            this._root.push(id);
        } else {
            log.trace2("Not inTrashbin");
            this._root.splice(this.getIndexById(this.trashbinId), 0, id);
        }

        if (markChanged) {
            this.setChanged();
        }

        log.debug("New leaf added :" + id);

        log.trace("[EXIT]");

        return id;
    }

    getLeaf(id) {
        return this._leaves[id];
    }

    delLeaf(id) {
        log.trace("[START]");

        id = id.toString();

        if (this._leaves[id] === undefined) {
            log.error("ID does not exist as a leaf :" + id);
            return false;
        }

        delete this._leaves[id];

        let index = this.getIndexById(id);

        if (index < 0) {
            log.error("ID does not exist in root :" + id);
            return false;
        }

        this._root.splice(index, 1);

        this.setChanged();

        log.trace("[EXIT]");

        return true;
    }

    setText(id, text) {
        log.trace("[START]");

        id = id.toString();

        if (this._leaves[id] === undefined) {
            log.error("Leaf does not exist :" + id);
            return;
        }

        let type = this._leaves[id].type;
        this._leaves[id] = this._createLeaf(type, text);

        this.setChanged();

        log.trace("[EXIT]");
    }

    getIndexById(id) {
        return this._root.indexOf(id);
    }

    isInTrashbin(id)
    {
        return this.getIndexById(this.trashbinId) < this.getIndexById(id);
    }

    moveLeafToEnd(index) {
        log.trace("[START]");

        let leafId = this._root[index];

        this._root.splice(index, 1);
        this._root.push(leafId);

        this.setChanged();

        log.trace("[EXIT]");
    }

    moveLeafAfterLeaf2(leafId, leafId2) {
        log.debug("[START]");
        log.trace("leafId1 :" + leafId + ", leafId2 :" + leafId2);

        let index = this.getIndexById(leafId);

        if (index < 0) {
            log.error("LeafId does not exist :" + leafId);
            return false;
        }

        if (leafId === leafId2) {
            log.debug("leafID===leafId2, skipping");
            return false;
        }

        this._root.splice(index, 1);

        let index2 = this.getIndexById(leafId2);

        if (index2 < 0) {
            if (leafId2 === "taskListTop") {
                log.debug("LeafId2=taskListTop, index=0")
                index2 = -1;
            } else {
                log.error("LeafId2 does not exist :" + leafId);
                return false;
            }
        }

        this._root.splice(index2 + 1, 0, leafId);

        this.setChanged();

        log.debug("[EXIT]");

        return true;
    }

    removeLeavesAfterTrash() {
        log.trace("[START]");
        log.trace2(this._root);

        for (let index = this._root.length - 1; index >= 0; --index) {
            let leafId = this._root[index];

            if (leafId === this.trashbinId) {
                break;
            }

            log.trace2("Removing :" + leafId);

            this.delLeaf(leafId);
        }

        log.trace("[EXIT]");
    }

    save(doneHandler = null, errorHandler = null) {
        log.debug("[START]");

        let THIS = this;

        this.resetChanged();

        if (doneHandler === null) {
            doneHandler = function() {
                log.debug("Data have been saved successfully");
            }
        }

        if (errorHandler === null) {
            errorHandler = function(message) {
                if (message === null || message === undefined) {
                    message = "no detailed information";
                }
                log.error("Data couldn't be saved : '" + message + "'");
                alert("Data couldn't be saved : '" + message + "'" +
                      "\n\nLet us try to save it again!\n");
                THIS.save();
            }
        }

        let data = this._getState();

        io.set(data, doneHandler, errorHandler);

        log.debug("[EXIT]");
    }

    checkField(object, field, type) {
        log.trace("[START]");

        let args = "{ " +
            "object:'" + object + "', " +
            "field:'" + field + "', " +
            "type:'" + type + "'" +
            " }";

        log.trace(args);

        if (typeof object === "undefined" ||
            typeof field === "undefined" ||
            typeof type === "undefined") {
            throw "Missing parameter :" + args;
        }

        if (!object.hasOwnProperty(field)) {
            throw "Field does not exist :" + args;
        }

        if (typeof object[field] !== type) {
            throw "Bad field type : '" + typeof object[field] + "' :" + args;
        }

        log.trace("[EXIT]");
    }

    /*
    {
        "version":"1.0",
        "root":["1499707287308","trashbin"],
        "leaves":
        {
            "trashbin":{"type":"TRASHBIN","text":""},
            "1499707287308":{"type":"ITEM","text":""}
        },
        "uistate": //Optional so not checked
        {
            "activeTaskItem":"1499707287308",
            "DragBarState_PageX":323
        }
    }
    */

    validateData_v1(data) {
        log.debug("[START]");

        this.checkField(data, "root", "object");
        this.checkField(data, "leaves", "object");
        this.checkField(data, "uistate", "object");

        if (data.root.length === 0) {
            throw "Root is empty!"
        }

        let dataRootLength = data.root.length;
        let dataLeavesLength = Object.keys(data.leaves).length
        if (dataRootLength !== dataLeavesLength) {
            throw "data.root.length('" + dataRootLength + "') != " +
                "data.leaves.length('" + dataLeavesLength + "')";
        }

        let leafTypes = new Set(["ITEM", "SEPARATOR", "TRASHBIN"]);
        let trashbinCounter = 0;
        for (let index = 0; index < data.root.length; ++index) {
            if (data.root[index] === this.trashbinId) {
                ++trashbinCounter;
            }

            if ( ! data.leaves.hasOwnProperty(data.root[index])) {
                throw "Missing leaf from leaves object :'" + data.root[index] + "'";
            }

            let leaf = data.leaves[data.root[index]];

            this.checkField(leaf, "type", "string");
            this.checkField(leaf, "text", "string");

            if ( ! leafTypes.has(leaf.type)) {
                throw "Unknown leaf type :'" + leaf.type + "'";
            }
        }

        if ( trashbinCounter != 1) {
            throw "The expected value of trashbinCounter is 1 but we got :" +
                   trashbinCounter;
        }

        log.debug("[EXIT]");
    }

    validateData(data) {
        log.debug("[START]");

        let returnValue = true;

        try {
            this.checkField(data, "version", "string");
            let version = data.version.split(".");
            let major = version[0];
            let minor = version[1];

            log.debug("Major :" + major + ", Minor :" + minor);

            switch(major) {
                case "1":
                    this.validateData_v1(data);
                    break;

                default:
                    throw "Unsopported version :" + data.version;
            }
        } catch (e) {
            log.error("Some error occurred while validating data : " + e);
            alert("Some error occurred while validating data : \n" + e);

            returnValue = false;
        }

        log.debug("[EXIT]");

        return returnValue;
    }

    load(doneHandler, errorHandler) {
        log.debug("[START]");

        let THIS = this;

        let callBack = function(data) {
            if (data === "") {
                log.debug("There is no data in storage!");
                THIS._resetState();
                data = THIS._getState();
            }

            if (THIS.validateData(data)) {
                THIS._setState(data);
                log.debug("Data have been loaded successfully");
                doneHandler();
            } else {
                errorHandler("Corrupt data in storage !");
            }
        }

        io.get(callBack, errorHandler);

        log.debug("[EXIT]");
    }

    exportData() {
        log.debug("[START]");

        let modelData = this._getState();
        let exportData = JSON.stringify(modelData);

        log.debug("[EXIT]");

        return exportData;
    }

    exportDataAsText() {
        log.debug("[START]");

        let unitSeparator = "\x1f"
        let delimiter = "\n" + unitSeparator;
        let unitSeparatorRe = new RegExp(unitSeparator, "g");
        let winLinebreakRe = new RegExp("\r\n", "g");

        let exportData = "TextNotes " + this._textExportVersion;

        exportData += delimiter + "############################";
        exportData += delimiter + "# DO NOT MODIFY THIS FILE! #";
        exportData += delimiter + "############################";

        for (let itemId of this.getRoot()) {
            let item = this.getLeaf(itemId);
            let text = item.text.replace(unitSeparatorRe, "").replace(winLinebreakRe, "\n");
            let type = item.type;
            let unit = delimiter + type + "\n" + text;
            exportData += unit;
        }

        log.debug("[EXIT]");

        return exportData;
    }

    importData(importData) {
        log.debug("[START]");

        let data = JSON.parse(importData);

        if (!this.validateData(data)) {
            throw "Corrupt data or version mismatching";
        }

        this._setState(data);

        log.debug("[EXIT]");
    }

    importDataAsText(importData) {
        log.debug("[START]");

        this.reset();

        let unitSeparator = "\x1f";
        let delimiter = "\n" + unitSeparator;
        let textPrefix = "TextNotes";
        let supportedVersion = "0.1";
        let dataArray = importData.replace(/\r\n/g,'\n').split(delimiter);

        let firstLine = dataArray[0].split(" ");
        if (firstLine[0] != textPrefix) {
            throw "Bad header";
        }

        if (firstLine[1] != supportedVersion) {
            throw "Not supported version :" + firstLine[1];
        }

        dataArray.shift();  // TextNotes <Version>
        dataArray.shift();  // Warning message line1
        dataArray.shift();  // Warning message line2
        dataArray.shift();  // Warning message line3

        let inTrashbin = false;
        for (let unit of dataArray) {
            let type = unit.split("\n", 1 )[0];
            let text = unit.substring(type.length + 1);

            if (type === "SEPARATOR" || type === "TRASHBIN") {
                if (text.length > 0) {
                    log.warning("Ignoring text because it should be empty, type :" + type + ", text :" + text);
                    text = "";
                }
            }

            switch(type) {
                case "ITEM":
                case "SEPARATOR":
                    this.addLeaf(type, inTrashbin, text, 0, false);
                    break;

                case "TRASHBIN":
                    if (inTrashbin) {
                        throw "Double Trashbin";
                    }

                    inTrashbin = true;
                    break;

                default:
                    throw "Unknown type :" + type;
            }

            log.debug("Added new leaf, type :" + type + ", text :" +text);
        }

        if (!inTrashbin) {
            throw "Missing Trashbin";
        }

        log.debug("[EXIT]");
    }

    reset() {
        log.debug("[START]");

        this.resetChanged();
        this._resetState();

        log.debug("[EXIT]");
    }
}

Model.create = function () {
    return new Model();
}
