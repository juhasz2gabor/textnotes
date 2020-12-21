"use strict";

class Dialog {
    constructor() {
        this._init();
    }

    _init() {
        this._create();
        this._render();
        this._loaded = false;
    }

    _create() {
        this.container = document.createElement("div");
        this.dialog = document.createElement("div");
        this.head = document.createElement("h3");
        this.closeButton = document.createElement("div");
        this.closeButton.tabIndex = -1;
        this.body = document.createElement("div");
        this.content = document.createElement("iframe");
        this.content.tabIndex = -1;
        this.content.id = "dialogWindow"

        this.body.appendChild(this.content);
        this.dialog.appendChild(this.head);
        this.dialog.appendChild(this.closeButton);
        this.dialog.appendChild(this.body);
        this.container.appendChild(this.dialog);

        this.container.className = "dialog-container";
        this.dialog.className = "dialog";
        this.head.className = "dialog-head";
        this.body.className = "dialog-body";
        this.closeButton.className = "dialog-close";
        this.content.className = "dialog-content";
        this.closeButton.setAttribute("type", "button");

        return this.container;
    }

    _render() {
        document.body.appendChild(this.container);
    }

    _log(caller) {
        console.log(caller + ", loaded:" + this._loaded + ", pageSource:" + this.content.src);
    }

    show(headerText, pageSource, width, height) {
        let THIS = this;

        THIS._loaded = false;

        let closeDialog = function() {
            THIS.closeButton.removeEventListener("click", closeDialog);
            window.removeEventListener("keydown", keyEvent);
            THIS.content.removeEventListener("load", closeDialog);
            THIS.hide();
        };

        let keyEvent = (event) => {
            if (event.key == "Escape") closeDialog();
        };

        let contentLoaded = () => {
            THIS._loaded = true;
            THIS.content.removeEventListener("load", contentLoaded);
            THIS.content.addEventListener("load", closeDialog);
        }

        this.closeButton.addEventListener("click", closeDialog);
        window.addEventListener("keydown", keyEvent);
        this.content.addEventListener("load", contentLoaded);

        this.head.innerText = headerText;
        this.content.src = pageSource;
        this.dialog.style.width = width + "px";
        this.dialog.style.height = height + "px";
        this.container.classList.add("visible");
        this.content.focus()
    }

    hide() {
        this.container.classList.remove("visible");
        this.content.src = "";
    }

    loaded() {
        return this._loaded;
    }
}

Dialog.create = function () {
    return new Dialog();
}
