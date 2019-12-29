"use strict";

function setNodeType(rootDiv, inTrashbin) {
    log.trace("[START]");

    let type = model.getLeaf(rootDiv.id).type;
    let nodes = rootDiv.childNodes;

    log.trace("Id :" + rootDiv.id + ", Type :" + type);

    switch (type) {
        case "ITEM":
            nodes[0].classList.remove("hidden"); // icon
            nodes[1].classList.remove("hidden"); // span: text
            nodes[2].classList.add("hidden"); // separator
            nodes[3].classList.add("hidden"); // trash arrow
            nodes[4].classList.add("hidden"); // trash icon
            nodes[5].classList.add("hidden"); // span: trash text
            rootDiv.draggable = "true";
            break;

        case "SEPARATOR":
            nodes[0].classList.add("hidden");
            nodes[1].classList.add("hidden");
            nodes[2].classList.remove("hidden");
            nodes[3].classList.add("hidden");
            nodes[4].classList.add("hidden");
            nodes[5].classList.add("hidden");
            rootDiv.draggable = "true";
            break;

        case "TRASHBIN":
            nodes[0].classList.add("hidden");
            nodes[1].classList.add("hidden");
            nodes[2].classList.add("hidden");
            nodes[3].classList.remove("hidden");
            nodes[4].classList.remove("hidden");
            nodes[5].classList.remove("hidden");
            setTrashbinArrow(nodes[3]);
            rootDiv.draggable = "";
            break;

        default:
            log.error("Unknown Type : '" + type + "'");
            return;
    }

    rootDiv.classList.remove("taskItemActive", "taskItemActiveFocusOut");

    setTrashStateOfNote(rootDiv, inTrashbin);

    log.trace("[EXIT]");
}

function setTrashbinArrow(node) {
    log.trace("[START]");

    if (openTrashbin) {
        log.trace2("Trashbin is open");
        node.classList.add("rotate90deg");
    } else {
        log.trace2("Trashbin is closed");
        node.classList.remove("rotate90deg");
    }

    log.trace("[EXIT]");
}

function setTrashStateOfNote(rootDiv, inTrashbin) {
    log.trace("[START]");

    if (inTrashbin) {
        log.trace2("In trashbin");
        rootDiv.classList.add("taskItemInTrash");

        if (!openTrashbin) {
            log.trace2("hidden");
            rootDiv.classList.add("hidden");
        } else {
            log.trace2("visible");
            rootDiv.classList.remove("hidden");
        }
    } else {
        log.trace2("! In trashbin");
        rootDiv.classList.remove("taskItemInTrash");
        rootDiv.classList.remove("hidden");
    }

    log.trace("[EXIT]");
}

function addTaskItem() {
    log.trace("[START]");

    let taskList = document.getElementById("taskList");
    let index = taskList.childNodes.length;
    let height = parseInt(getComputedStyle(document.querySelector('.taskItem')).height);

    log.trace("Index :" + index);

    let rootDiv = document.createElement("div");
    rootDiv.className = "taskItem";
    rootDiv.style.top = (index * height) + "px";
    rootDiv.onmousedown = clickOnItem;

    rootDiv.addEventListener("dragstart", dragStart);
    rootDiv.addEventListener("dragenter", dragEnter);
    rootDiv.addEventListener("drop", dragDrop);
    rootDiv.addEventListener("dragover", dragOver);
    rootDiv.addEventListener("dragend", dragEnd);

    // TaskIcon [0]
    let taskIcon = document.createElement("img");
    taskIcon.className = "taskIcon hidden";
    taskIcon.src = "../icons/blank.gif";

    // TaskText [1]
    let taskSpan = document.createElement("span");
    taskSpan.className = "taskText hidden";
    taskSpan.appendChild(document.createTextNode(""));

    // Separator [2]
    let separatorSpan = document.createElement("img");
    separatorSpan.className = "taskSeparator hidden";
    separatorSpan.src = "../icons/blank.gif";

    // TrashArrow [3]
    let trashArrow = document.createElement("img");
    trashArrow.className = "trashArrow hidden rotate90deg";
    trashArrow.src = "../icons/blank.gif";

    // TrashIcon [4]
    let trashIcon = document.createElement("img");
    trashIcon.className = "trashIcon hidden";
    trashIcon.src = "../icons/blank.gif";

    // TrashText [5]
    let trashSpan = document.createElement("span");
    trashSpan.className = "trashText hidden";
    trashSpan.appendChild(document.createTextNode("Trash"));

    rootDiv.appendChild(taskIcon)
    rootDiv.appendChild(taskSpan);
    rootDiv.appendChild(separatorSpan);
    rootDiv.appendChild(trashArrow)
    rootDiv.appendChild(trashIcon)
    rootDiv.appendChild(trashSpan);

    taskList.appendChild(rootDiv);

    log.trace("[EXIT]");
}

function delTaskItem() {
    log.trace("[START]");

    let taskList = document.getElementById("taskList");
    let index = taskList.childNodes.length - 1;

    if (1 > index) {
        log.error("No item to be deleted !");
        return false;
    }

    taskList.removeChild(taskList.childNodes[index]);

    log.trace("[EXIT]");

    return true;
}

function setTaskName(leafId) {
    log.trace2("[START]");
    log.trace2("leafId : " + leafId);

    let firstLine = model.getLeaf(leafId).text.trimLeft().split('\n', 1)[0];
    document.getElementById(leafId).childNodes[1].textContent = firstLine;

    log.trace2("firstLine :" + firstLine);
    log.trace2("[EXIT]");
}

function updateTaskItems() {
    log.debug("[START]");

    let taskList = document.getElementById("taskList");
    let count = taskList.childNodes.length;

    for (let index=0, inTrash=false; index<count; ++index) {
        let leafId = model.getRoot()[index];
        let leaf = model.getLeaf(leafId);

        log.trace("leafId :" + leafId + ", leafType :" + leaf.type);

        taskList.childNodes[index].id = leafId;

        if (leaf.type === "ITEM") {
            setTaskName(leafId);
        }

        setNodeType(taskList.childNodes[index], inTrash);

        if (leaf.type === "TRASHBIN") {
            inTrash = true;
        }
    }

    log.debug("[EXIT]");
}

function updateDOM() {
    log.debug("[START]");

    let domLength = document.getElementById("taskList").childNodes.length;
    let modelLength = model.getRoot().length;

    log.trace("domLength :" + domLength + ", modelLength :" + modelLength);

    let action = (domLength < modelLength) ? addTaskItem : delTaskItem;
    log.trace("Selected action :" + action.name);

    let actionCounter = Math.abs(domLength - modelLength);
    log.trace("action counter :" + actionCounter);

    for (; actionCounter > 0; --actionCounter, action());

    domLength = document.getElementById("taskList").childNodes.length;

    if (domLength != modelLength)
    {
        log.error("domLength != modelLength");
        log.error("domLength :" + domLength + ", modelLength :" + modelLength);
    }

    log.debug("[EXIT]");
}

function updateTaskList() {
    log.debug("[START]");

    updateDOM();
    updateTaskItems();

    log.debug("[EXIT]");
}
