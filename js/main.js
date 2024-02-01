import State from "./State.js"
import BoxService from "./BoxService.js";
import LinkingService from "./LinkingService.js";
import FileService from "./FileService.js"

const VIEWPORT_MOVE_STEP_ARROWS = 10


fabric.Canvas.prototype.historyInit = function () {
    this.historyUndo = []
    this.historyNextState = this.historyNext()
    this.historyRedo = []

}

fabric.Canvas.prototype.historyNext = function () {
    return FileService.generateJsonString()
}

fabric.Canvas.prototype.historySaveAction = function () {
    if (this.historyProcessing)
        return;
    const json = this.historyNextState;
    this.historyUndo.push(json);
    this.historyNextState = this.historyNext();
}

fabric.Canvas.prototype.undo = function () {
    // The undo process will render the new states of the objects
    // Therefore, object:added and object:modified events will triggered again
    // To ignore those events, we are setting a flag.
    this.historyProcessing = true;

    const history = this.historyUndo.pop();
    if (history) {
        this.historyRedo.push(this.historyNext());
        this.getObjects().forEach(obj => {
            if (obj.type !== "image") {
                this.remove(obj)
            }
        })
        document.getElementById("box-list").innerHTML = ""
        State.resetState()
        FileService.loadFromJsonString(history)
    }

    this.historyProcessing = false;
}

fabric.Canvas.prototype.redo = function () {
    // The undo process will render the new states of the objects
    // Therefore, object:added and object:modified events will triggered again
    // To ignore those events, we are setting a flag.
    this.historyProcessing = true;
    const history = this.historyRedo.pop();
    if (history) {
        // Every redo action is actually a new action to the undo history
        this.historyUndo.push(this.historyNext());
        this.getObjects().forEach(obj => {
            if (obj.type !== "image") {
                this.remove(obj)
            }
        })
        document.getElementById("box-list").innerHTML = ""
        State.resetState()
        FileService.loadFromJsonString(history)
    }

    this.historyProcessing = false;
}

document.addEventListener("DOMContentLoaded", () => {

    //Creating the canvas
    State.canvas = new fabric.Canvas('canvas', {
        preserveObjectStacking: true, //Super useful to handle Z index, if false, Z index is not controllable
        selection: false,
        perPixelTargetFind: true,
        uniScaleTransform: true, //Prevent proportions conservation when resizing with the corner button
    });


    //Shortcuts
    document.body.addEventListener("keydown", e => {
        if  (State.selectedBoxId !== null) {
            switch (e.code.toLowerCase()) {
                case "delete":
                // case "backspace":
                    BoxService.deleteBox(State.selectedBoxId)
                    State.canvas.historySaveAction()
                    break
                case "digit0":
                case "numpad0":
                    BoxService.changeLabel(State.selectedBoxId, "header")
                    break
                case "digit1":
                case "numpad1":
                    BoxService.changeLabel(State.selectedBoxId, "key")
                    break
                case "digit2":
                case "numpad2":
                    BoxService.changeLabel(State.selectedBoxId, "value")
                    break
                case "digit3":
                case "numpad3":
                    BoxService.changeLabel(State.selectedBoxId, "others")
                    break
                default:
                    break
            }
        }
        switch (e.key.toLowerCase()) {
            case "z":
                if ((e.ctrlKey || e.metaKey)) {
                    if (e.shiftKey) {
                        State.canvas.redo()
                        break
                    }
                    State.canvas.undo()
                }
                break
            case "arrowup":
            case "arrowdown":
            case "arrowleft":
            case "arrowright":
                moveViewport(e.code.toLowerCase())
                break
            case "s":
                if (e.ctrlKey || e.metaKey) {
                    exportResult()
                    e.preventDefault()
                }
                break
            case "m":
                mergeBoxes()
                break
            default:
                break
        }
    })

    //Exporting the result
    document.getElementById("export-button").addEventListener("click", e => {
        exportResult()
    })

    //Showing the current image name on top
    document.getElementById("current-image").innerText = FileService.getImageName()
    //Changing image
    document.getElementById("next").addEventListener("click", () => {
        changePage("next")
    })
    document.getElementById("previous").addEventListener("click", () => {
        if (State.currentFileNumber <= 0) {
            return
        }
        changePage("previous")
    })

    let showLinksButton = document.getElementById("show-links-button")
    showLinksButton.addEventListener("click", () => {
        State.showAllLinks = !State.showAllLinks
        LinkingService.toggleAllLinksVisibility(State.showAllLinks)

        if (State.showAllLinks) {
            showLinksButton.innerText = "Show selected NELs only"
            return
        }
        showLinksButton.innerText = "Show all NELs"
    })

    let mergingModeButton = document.getElementById("toggle-merging-button")
    mergingModeButton.addEventListener("click", () => {
        State.mergingMode = !State.mergingMode

        if (State.mergingMode) {
            mergingModeButton.innerText = "Disable box merging mode"
            document.getElementById("merge-button").style.display = "block"
            State.canvas.selection = true
            return
        }
        mergingModeButton.innerText = "Enable box merging mode"
        document.getElementById("merge-button").style.display = "none"
        State.canvas.selection = false
    })

    document.getElementById("merge-button").addEventListener("click", mergeBoxes)



    //Handling mouse down event on the canvas
    State.canvas.on('mouse:down', function(event){
        //If any of those keys are pressed, moving the mouse will move the viewport of the canvas
        if (event.e.ctrlKey || event.e.metaKey) {
            State.isMovingViewport = true
            State.mouseOriginX = event.e.clientX
            State.mouseOriginY = event.e.clientY

            if (State.mergingMode) {
                //We disable selection because we don't want it while we move the viewport, we will re-enable it after
                State.canvas.selection = false
            }

            //And we return because we don't want to create boxes or links while we move the viewport
            return
        }

        State.isMouseDown = true

        if (!State.hoverLinkButton) {
            BoxService.handleMouseDown(event)
            return
        }
        LinkingService.handleMouseDown(event)
    });

    //Handling mouse move envent on the canvas
    State.canvas.on('mouse:move', function(event){
        if (State.isMovingViewport) {
            //We modify the vewport according to the difference of coordinates
            // between the last time and now
            State.canvas.setViewportTransform([
                State.canvas.viewportTransform[0],
                State.canvas.viewportTransform[1],
                State.canvas.viewportTransform[2],
                State.canvas.viewportTransform[3],
                State.canvas.viewportTransform[4] += event.e.clientX - State.mouseOriginX,
                State.canvas.viewportTransform[5] += event.e.clientY - State.mouseOriginY
            ])
            //To avoid image going very far
            centerViewport()
            //And we re-render the canvas
            State.canvas.renderAll()
            State.mouseOriginX = event.e.clientX
            State.mouseOriginY = event.e.clientY
            //And we return because we don't want to create boxes or links while we move the viewport
            return
        }

        //Setting useful state variables
        State.hoverBox = event.target !== null && event.target.type === "box"
        State.hoverLinkButton = event.target !== null && event.target.type === "linkButton"

        //We do this only if the mouse is pressed
        if (State.isMouseDown) {
            BoxService.handleMouseMove(event)
            LinkingService.handleMouseMove(event)
            State.canvas.renderAll();
        }
    });

    State.canvas.on('mouse:up', function(event){
        if (State.isMovingViewport) {
            State.isMovingViewport = false
            if (State.mergingMode) {
                State.canvas.selection = true
            }
            return
        }

        //We do this only if the mouse is pressed
        if (State.isMouseDown) {
            BoxService.handleMouseUp(event)
            LinkingService.handleMouseUp(event)
        }
        State.isMouseDown = false;
        State.canvas.historySaveAction()
    });

    //When scrolling on the canvas
    State.canvas.on('mouse:wheel', function(event) {

        let delta = - event.e.deltaY;
        let zoom = State.canvas.getZoom();
        zoom = zoom + delta/200;
        if (zoom > 20) zoom = 20;
        if (zoom < 1) zoom = 1;
        State.canvas.zoomToPoint({ x: event.e.offsetX, y: event.e.offsetY }, zoom);
        centerViewport()
        State.canvas.renderAll()
        event.e.preventDefault();
        event.e.stopPropagation();
    });

    setImage(FileService.getImageFilePath())
        .then(() => {
            State.canvas.historyInit()
        })

});

function setImage(path) {
    return new Promise((resolve, reject) => {
        // (Solved) Warning, the image can be loaded a little after, so if there is already things on the canvas,
        // the image can be placed on top of it
        new fabric.Image.fromURL(path, function(oImage){
            State.image = oImage
            State.image.set({
                left: 0,
                top: 0,
                hasControls: false,
                lockMovementX: true,
                lockMovementY: true,
                lockScalingX: true,
                lockScalingY: true,
                lockUniScaling: true,
                lockRotation: true,
                selectable: false,
                hoverCursor: "auto",
                type: "image",
            });
            State.image.scaleToHeight(State.canvas.height);
            State.image.scaleToWidth(State.canvas.width);
            State.canvas.add(State.image);
            //So we send the image to the background
            State.image.sendToBack();

            // Ensuring the image is rendered in the canvas before proceeding
            State.canvas.renderAll();

            // Function to handle the loading of data (local storage or file)
            function loadData() {
                if (window.localStorage.getItem(FileService.getImageName()) !== null) {
                    UIkit.modal.confirm("Data has been found in local storage. Do you want to import it?")
                        .then(() => {
                            // Getting the stored data in the localstorage
                            // console.log(`Load ${FileService.getImageName()} from local storage.`)
                            let objects = JSON.parse(window.localStorage.getItem(FileService.getImageName()))
                            //And creating the boxes and links
                            BoxService.createBoxesFromArray(objects)
                            LinkingService.createLinksFromArray(objects)
                            resolve()
                        }, () => { //Otherwise getting data from file
                            // console.log(`Load ${FileService.getImageName()} from OCR json.`)
                            FileService.loadJson()
                            resolve()
                        });
                } else {
                    // Loading from json file otherwise
                    FileService.loadJson();
                    resolve();
                }
            }

            // Use setTimeout to allow the UI thread to update with the image before loading data
            setTimeout(loadData, 0);
        })
    });
}

function changePage(direction) {
    //We first save the changes in the localstorage
    window.localStorage.setItem(FileService.getImageName(), FileService.generateJsonString())
    //We send a little alert if the user hasn't saved yet
    if (!State.saveAlert) {
        UIkit.notification("Don't forget to save. Click again to skip anyway", {status: 'warning', pos: "bottom-center"})
        State.saveAlert = true
        return
    }
    //Removing all the objects from the canvas
    State.canvas.remove(...State.canvas.getObjects())
    //Reseting all the state variables
    State.resetState()
    //And clearing the box list
    document.getElementById("box-list").innerHTML = ""
    switch (direction) {
        case "next":
            State.currentFileNumber++
            break
        case "previous":
            State.currentFileNumber--
            break
        default:
            State.currentFileNumber++
            break
    }
    //Changing the displayed image name
    document.getElementById("current-image").innerText = FileService.getImageName()
    //And loading the new image
    try {
        setImage(FileService.getImageFilePath())
    } catch (e) {
        UIkit.notification("There is no " + FileService.getImageName(), {status: 'danger', pos: "bottom-center"})
    }
}

function centerViewport() {
    //We check that the viewport coordinates are inside the image coordinates
    if (State.canvas.viewportTransform[4] >= 0) {
        State.canvas.viewportTransform[4] = 0
        //Don't forget to multiply the width and height of the image by the scale
    } else if (State.canvas.viewportTransform[4] < State.canvas.getWidth() - (State.image.width * State.image.scaleX) * State.canvas.getZoom()) {
        State.canvas.viewportTransform[4] = State.canvas.getWidth() - (State.image.width * State.image.scaleX) * State.canvas.getZoom()
    }

    if (State.canvas.viewportTransform[5] >= 0) {
        State.canvas.viewportTransform[5] = 0
    } else if (State.canvas.viewportTransform[5] < State.canvas.getHeight() - (State.image.height * State.image.scaleY) * State.canvas.getZoom()) {
        State.canvas.viewportTransform[5] = State.canvas.getHeight() - (State.image.height * State.image.scaleY) * State.canvas.getZoom()
    }
}

function moveViewport(direction) {

    let moveX = 0
    let moveY = 0

    switch(direction) {
        case "arrowup":
            moveY = VIEWPORT_MOVE_STEP_ARROWS
            break
        case "arrowdown":
            moveY = - VIEWPORT_MOVE_STEP_ARROWS
            break
        case "arrowleft":
            moveX = VIEWPORT_MOVE_STEP_ARROWS
            break
        case "arrowright":
            moveX = - VIEWPORT_MOVE_STEP_ARROWS
    }

    State.canvas.setViewportTransform([
        State.canvas.viewportTransform[0],
        State.canvas.viewportTransform[1],
        State.canvas.viewportTransform[2],
        State.canvas.viewportTransform[3],
        State.canvas.viewportTransform[4] += moveX,
        State.canvas.viewportTransform[5] += moveY
    ])
    //To avoid image going very far
    centerViewport()
    //And we re-render the canvas
    State.canvas.renderAll()
}

function exportResult() {
    const blob = new Blob([FileService.generateJsonString()], {type: "text/json;encoding=utf8"})
    let link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = FileService.getImageName() + "_output.json";
    link.click();
    State.saveAlert = true
}

function mergeBoxes() {
    if (State.mergingMode) {
        let selection = State.canvas.getActiveObject()
        if (selection !== null && selection._objects !== undefined) {
            let boxes = selection._objects.map(obj => State.boxArray[obj.id])
            boxes.forEach(box => {
                BoxService.deleteBox(box.box.id)
            })
            //We sort from the left to the right
            boxes.sort((a, b) => a.box.left >= b.box.left ? 1 : -1)
            //in order to concat the text
            let text = boxes.reduce((str, box) => str + box.content, "").trim()
            let createdId = BoxService.createBox({
                left: selection.left,
                top: selection.top,
                width: selection.aCoords.br.x - selection.left - 1,
                height: selection.aCoords.br.y - selection.top - 1, //Fabric adds 1 pixel for whatever reason so ¯\_(ツ)_/¯
                text: text
            }, () => {
                State.canvas.discardActiveObject()
                State.canvas.setActiveObject(State.boxArray[createdId].box)
                BoxService.selectBox(State.boxArray[createdId].box)
                State.canvas.historySaveAction()
            })
        }
    }
}







