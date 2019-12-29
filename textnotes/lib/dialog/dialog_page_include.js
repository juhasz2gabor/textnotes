"use strict";

function dialogKeyEvent(event) {
    if (event.key == "Escape") {
        closeDialog();
    }
}

function closeDialog() {
    setTimeout(()=> { document.location="about:blank"; }, 0);
}

window.addEventListener("keydown", dialogKeyEvent);
