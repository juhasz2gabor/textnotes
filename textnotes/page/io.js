"use strict";

class IO {

    constructor(id) {
        log.trace("[START]");

        this._key = "TextNotes";
        this._type = "local";
        this._idField = "_sender";
        this._messageVersionKey = "TextNotes_MessageVersion";

        this._id = id.replace(":", "_");
        this._onChanged = null;
        this.registerChanged();

        log.trace("[EXIT]");
    }

    registerChanged() {
        log.trace("[START]");

        let THIS = this;
        browser.storage.onChanged.addListener(
            function(changes, area) {
                THIS.onChanged(changes, area);
            });

        log.trace("[EXIT]");
    }

    set(value, callback, callbackError) {
        log.trace("[START]");

        value[this._idField] = this._id;
        log.trace("ID :" + this._id);

        let item = {
            [this._key]: value
        };

        try {
            let result = browser.storage.local.set(item);
            result.then(callback, callbackError);
        } catch(e) {
            log.debug("Exception occured!");
            callbackError(e);
        }

        log.trace("[EXIT]");
    }

    get(callback, callbackError) {
        log.trace("[START]");

        let THIS = this;
        let callbackExtraction =
            function(item) {
                let value = item.hasOwnProperty(THIS._key) ? item[THIS._key] : "";

                if (value !== "") {
                    delete value[THIS._idField];
                }

                callback(value);
            };

        try {
            let result = browser.storage.local.get(this._key);
            result.then(callbackExtraction, callbackError);
        } catch(e) {
            log.debug("Exception occured!");
            callbackError(e);
        }

        log.trace("[END]");
    }

    del(callback, callbackError) {
        log.trace("[START]");

        try {
            let result = browser.storage.local.remove(this._key);
            result.then(callback, callbackError);
        } catch(e) {
            log.debug("Exception occured!");
            callbackError(e);
        }

        log.trace("[EXIT]");
    }

    onChanged(changes, area) {
        log.trace("[START]");

        if (this._onChanged !== null &&
            area === this._type &&
            changes.hasOwnProperty(this._key))
            if (!changes[this._key].hasOwnProperty("newValue") ||
                changes[this._key]["newValue"][this._idField] !== this._id) {
                log.trace("Calling callback function");
                this._onChanged();
            } else {
                log.debug("OnChanged notification about its own operation");
            }

        log.trace("[EXIT]");
    }

    setOnChanged(callback) {
        this._onChanged = callback;
    }

    setByKey(key, value, callback, callbackError) {
        log.trace("[START]");
        if (key == this._key || key == Logger.LogKey) {
            let errorMessage = "Error : " + key + " is a protected key. It can not be used in io.setByKey().";
            log.error(errorMessage);
            callbackError(errorMessage)
        } else {
            try {
                let result = browser.storage.local.set({ [key]: value });
                result.then(callback, callbackError);
            } catch(e){
                log.debug("Exception occured!");
                callbackError(e);
            }
        }

        log.trace("[EXIT`]");
    }

    getByKey(key, callback, callbackError) {
        log.trace("[START]");

        if (key == this._key || key == Logger.LogKey) {
            let errorMessage = "Error : " + key + " is a protected key. It can not be used in io.getByKey().";
            log.error(errorMessage);
            callbackError(errorMessage)
        } else {
            let callbackExtraction =
                function(item) {
                    let value = item.hasOwnProperty(key) ? item[key] : "";
                    callback(value);
                };

            try {
                let result = browser.storage.local.get(key);
                result.then(callbackExtraction, callbackError);
            } catch(e) {
                log.debug("Exception occured!");
                callbackError(e);
            }
        }

        log.trace("[EXIT]");
    }

    delByKey(key, callback, callbackError) {
        log.trace("[START]");

        if (key == this._key || key == Logger.LogKey) {
            let errorMessage = "Error : " + key + " is a protected key. It can not be used in io.delByKey().";
            log.error(errorMessage);
            callbackError(errorMessage)
        } else {
            try {
                let result = browser.storage.local.remove(key);
                result.then(callback, callbackError);
            } catch(e) {
                log.debug("Exception occured!");
                callbackError(e);
            }
        }

        log.trace("[EXIT]");
    }
}

IO.create = function(id) {
    return new IO(id);
}
