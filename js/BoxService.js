import State from "./State.js"
import LinkingService from "./LinkingService.js";

const LINK_BUTTON_RADIUS = 5;
const LINK_BUTTON_OFFSET = 10;

//This is a combination of label/color used for coloring the boxes. Feel free to change this, it will modify the colors everywhere.
const boxColors = {
    brand: "rgb(170,0,0)",
    loc: "rgb(170,80,13)",
    pers: "rgb(170,153,21)",
    total: "rgb(103,170,0)",
    date: "rgb(29,170,5)",
    label: "rgb(24,170,135)",
    price: "rgb(36,124,170)",
    bundle: "rgb(0,51,170)",
    phone: "rgb(49,0,170)",
    misc: "rgb(116,0,170)",
    payment: "rgb(0,0,0)",
    barcode: "rgb(63,62,64)",
}

fabric.Object.prototype.borderScaleFactor = 2

export default class BoxService {

    static handleMouseDown(event) {

        if (State.selectedBoxId !== null) {
            //We hide the link button, and we will show it later if needed
            BoxService.changeDrawLinkButtonVisibility(State.selectedBoxId, false)
            if (!State.showAllLinks) {
                LinkingService.changeLinksVisibility(State.selectedBoxId, false)
            }
            let box = document.getElementById(`box-${State.selectedBoxId}`)
            //Same for the "selected" class of the box in the list
            if (box !== null) {
                box.classList.remove("box-selected")
            }
        }

        if (State.hoverBox) {

            BoxService.selectBox(State.canvas.getActiveObject())
            //We return to avoid creating a new box
            return

        }

        //We don't want to to anything while we are in merging mode
        if (State.mergingMode) {
            return
        }

        //If we got here that means we were neither over a box or a link button
        //so we set a variable to tell that we are starting to create a box
        State.isCreatingBox = true
        let pointer = State.canvas.getPointer(event.e);
        State.mouseOriginX = pointer.x;
        State.mouseOriginY = pointer.y;

        State.boxArray[State.currentBoxId] =
            //We store an object in the boxArray containing all the useful infos we'll need later
            {
                //We create a new Rect at the mouse position
                box: new fabric.Rect({
                    left: State.mouseOriginX,
                    top: State.mouseOriginY,
                    fill: 'rgb(220, 0, 0)',
                    opacity: 0.3,
                    id: State.currentBoxId,
                    type: "box",
                    lockRotation: true,
                    uniScaleTransform: true,
                }),

                content: "",
                label: "",
                //OriginLinks are the IDs of the links that goes from this box
                originLinks: [],
                //And this is the IDs of the links that goes to this box
                destinationLinks: []
            }
        //And we add the box to the canvas
        State.canvas.add(State.boxArray[State.currentBoxId].box);
    }

    static handleMouseMove(event) {
        if (!State.isCreatingBox) {
            //Nothing to do here if we are not creating a box so we return
            return
        }
        let pointer = State.canvas.getPointer(event.e);

        //Some geometry magic to set the top or left value to the mouse position
        // if the mouse position value is lesser than the original value
        if(State.mouseOriginX > pointer.x){
            State.boxArray[State.currentBoxId].box.set({ left: Math.abs(pointer.x) });
        }
        if(State.mouseOriginY > pointer.y){
            State.boxArray[State.currentBoxId].box.set({ top: Math.abs(pointer.y) });
        }

        //And we set the width and height of the box to the difference between mouse coordinates and origin
        State.boxArray[State.currentBoxId].box.set({ width: Math.abs(State.mouseOriginX - pointer.x) });
        State.boxArray[State.currentBoxId].box.set({ height: Math.abs(State.mouseOriginY - pointer.y) });
        State.boxArray[State.currentBoxId].box.setCoords()
    }

    static handleMouseUp(event) {

        if (!State.isCreatingBox) {
            //We return because we don"t have anything to do if we're not creating abox
            return
        }

        State.isManagingBox = false
        State.isCreatingBox = false
        //We cancel the creation of the box if the width/height is null
        if (State.boxArray[State.currentBoxId].box.height === 0 || State.boxArray[State.currentBoxId].box.width === 0) {
            State.canvas.remove(State.boxArray[State.currentBoxId].box)
            delete State.boxArray[State.currentBoxId]
            return
        }

        BoxService.addBoxToList(State.boxArray[State.currentBoxId])
        BoxService.createLinkButton(State.currentBoxId, () => {
            State.canvas.setActiveObject(State.boxArray[State.currentBoxId].box)
            BoxService.selectBox(State.boxArray[State.currentBoxId].box)
            State.canvas.renderAll()

            //This event listener will update the position of the links linked to this box when the box is moved
            State.boxArray[State.currentBoxId].box.on("moving", event => {
                BoxService.updateLinkPositions(event)
            })
            //Same for scaling
            State.boxArray[State.currentBoxId].box.on("scaling", event => {
                BoxService.updateLinkPositions(event)
            })
            State.currentBoxId++
        })

    }

    static deleteBox(id) {
        //We remove the box and the link button from the canvas
        State.canvas.remove(State.boxArray[id].box);
        State.canvas.remove(State.boxArray[id].linkButton)
        //And the box in the list
        document.getElementById("box-" + id).remove()
        //And we delete each links linked to the box
        //Here we use a for in instead of a foreach, because of the reindexing thing we make when we delete links
        for (let i in State.boxArray[id].originLinks) {
            LinkingService.deleteLink(State.boxArray[id].originLinks[i])
        }
        for (let i in State.boxArray[id].destinationLinks) {
            LinkingService.deleteLink(State.boxArray[id].destinationLinks[i])
        }
        delete State.boxArray[id]

        BoxService.reindexBoxes(id)
        State.selectedBoxId = null
    }

    static addBoxToList(box) {

        const boxHtmlTemplate = `
            <div class="uk-card uk-card-default uk-card-small uk-margin-top box-container" id='box-${box.box.id}'>
                <div class="uk-card-body uk-flex uk-flex-between uk-flex-middle">
                <h4>${box.box.id}.</h4>
                    <div>
                        <label for="content">Content text</label>
                        <input id="content-${box.box.id}" class="uk-input uk-form-small" type="text">
                    </div>
                    <div>
                        <label for="label">Type</label>
                        <select class="uk-select uk-form-small" id='label-${box.box.id}' name="label">
                        <option value=""></option>
                        <option value="brand">Brand</option>
                        <option value="loc">Location</option>
                        <option value="pers">Person</option>
                        <option value="total">Total</option>
                        <option value="date">Date</option>
                        <option value="label">Label</option>
                        <option value="price">Price</option>
                        <option value="bundle">Bundle</option>
                        <option value="phone">Phone</option>
                        <option value="misc">Misc</option>
                        <option value="payment">Payment</option>
                        <option value="barcode">Barcode</option>
                        </select>
                    </div>
                    <div>
                        <br />
                        <button class="uk-button uk-button-default uk-button-small nel-button" uk-toggle='target: #links-modal' id='box-nel-button-${box.box.id}'>NELs</button>
                    </div>
                    <div>
                        <br />
                        <button class="uk-button uk-button-danger uk-button-small" id='box-remove-button-${box.box.id}'><span class="box-remove-button" uk-icon="close"></span></button>
                    </div>
                </div>
            </div>`

        let template = document.createElement("template")
        template.innerHTML = boxHtmlTemplate.trim()


        document.getElementById("box-list").appendChild(template.content.firstChild);

        document.getElementById("box-" + box.box.id).addEventListener("click", () => {
            //When clicking on the bxo in the list, this will select the box in the canvas,
            // and change the visibility of the link button

            if (State.selectedBoxId !== null) {
                BoxService.changeDrawLinkButtonVisibility(State.selectedBoxId, false)
                if (!State.showAllLinks) {
                    LinkingService.changeLinksVisibility(State.selectedBoxId, false)
                }
                let boxHtml = document.getElementById(`box-${State.selectedBoxId}`)
                if (boxHtml !== null) {
                    boxHtml.classList.remove("box-selected")
                }
            }

            State.selectedBoxId = box.box.id
            BoxService.changeDrawLinkButtonVisibility(State.selectedBoxId, true)
            if (!State.showAllLinks) {
                LinkingService.changeLinksVisibility(State.selectedBoxId, true)
            }
            let boxHtml = document.getElementById(`box-${State.selectedBoxId}`)
            if (boxHtml !== null) {
                boxHtml.classList.add("box-selected")
                State.canvas.setActiveObject(State.boxArray[State.selectedBoxId].box)
                State.canvas.renderAll()
            }
        })

        //We set the background color to the corresponding label color
        if (box.label !== undefined && boxColors[box.label.toLowerCase()] !== undefined) {
            document.getElementById("box-" + box.box.id).style.backgroundColor = boxColors[box.label.toLowerCase()]
        }

        let removeButton = document.getElementById(`box-remove-button-${box.box.id}`)
        removeButton.addEventListener("click", () => {
            BoxService.deleteBox(box.box.id)
            State.canvas.historySaveAction()
        });

        let nelButton = document.getElementById(`box-nel-button-${box.box.id}`)
        nelButton.addEventListener("click", () => {
            LinkingService.showModal(box.box.id)
        });

        let textInput = document.getElementById("content-" + box.box.id)
        textInput.value = box.content
        textInput.addEventListener("input", e => {
            State.boxArray[box.box.id].content = e.target.value
        })

        let labelSelect = document.getElementById("label-" + box.box.id)
        labelSelect.value = box.label.toLowerCase()
        labelSelect.addEventListener("change", e => {
            BoxService.changeLabel(box.box.id, e.target.value.toLowerCase())
        })
    }

    static createLinkButton(idBox, callback) {
        let box = State.boxArray[idBox].box

        new fabric.Image.fromURL("/images/link.svg", function(oImage){
            State.boxArray[idBox].linkButton = oImage
            State.boxArray[idBox].linkButton.set({
                left: box.aCoords.tr.x + LINK_BUTTON_OFFSET,
                top: box.aCoords.tr.y + box.height / 2 - LINK_BUTTON_RADIUS,
                id: idBox,
                backgroundColor: 'rgba(18,63,255, 0.5)',
                zIndex: 100,
                lockMovementX: true,
                lockMovementY: true,
                lockScalingX: true,
                lockScalingY: true,
                lockUniScaling: true,
                lockRotation: true,
                hoverCursor: "pointer",
                type: "linkButton",
                hasControls: false,
                clipPath: new fabric.Circle({
                    radius: 10,
                    originX: 'center',
                    originY: 'center',
                }),
            });
            State.boxArray[idBox].linkButton.scaleToHeight(LINK_BUTTON_RADIUS * 2);
            State.boxArray[idBox].linkButton.scaleToWidth(LINK_BUTTON_RADIUS * 2);
            if (callback) {
                callback()
            }
        });

    }

    static changeDrawLinkButtonVisibility(idBox, show) {
        if (show) {
            State.canvas.add(State.boxArray[idBox].linkButton)
            return
        }
        State.canvas.remove(State.boxArray[idBox].linkButton)
    }

    static updateLinkPositions(event) {
        let boxArrayObject = State.boxArray[event.target.id]
        //Updating the link button position
        boxArrayObject.linkButton.left = event.target.left + (event.target.width * event.target.scaleX) + LINK_BUTTON_OFFSET
        boxArrayObject.linkButton.top = event.target.top + (event.target.height * event.target.scaleY) / 2 - LINK_BUTTON_RADIUS
        boxArrayObject.linkButton.setCoords()

        //And the links according to the center of the box
        for (let linkId of boxArrayObject.originLinks) {
            if (State.linkArray[linkId] !== undefined) {
                State.linkArray[linkId].link.set({x1: boxArrayObject.box.getCenterPoint().x, y1: boxArrayObject.box.getCenterPoint().y})
                State.linkArray[linkId].link.setCoords()
            }
        }
        for (let linkId of boxArrayObject.destinationLinks) {
            if (State.linkArray[linkId] !== undefined) {
                State.linkArray[linkId].link.set({x2: boxArrayObject.box.getCenterPoint().x, y2: boxArrayObject.box.getCenterPoint().y})
                State.linkArray[linkId].link.setCoords()
                State.linkArray[linkId].circle.set({left: boxArrayObject.box.getCenterPoint().x - 3, top: boxArrayObject.box.getCenterPoint().y - 3})
                State.linkArray[linkId].circle.setCoords()
            }
        }
    }

    static deleteLink(idBox, idLink) {
        //Here I could have used a filter to remove the link but we need to keep the values that the
        // delete statement let in the array, again this is because of the reindex magic
        State.boxArray[idBox].originLinks.forEach((val, index) => {
            if (val === idLink) {
                delete State.boxArray[idBox].originLinks[index]
            }
        })
        State.boxArray[idBox].destinationLinks.forEach((val, index) => {
            if (val === idLink) {
                delete State.boxArray[idBox].destinationLinks[index]
            }
        })
    }

    static createBoxesFromArray(boxes) {
        for (let box of boxes) {
            BoxService.createBox({
                id: box.id,
                left: box.box[0] * State.image.scaleX,
                top: box.box[1] * State.image.scaleY,
                width: box.box[2] * State.image.scaleX - box.box[0] * State.image.scaleX,
                height: box.box[3] * State.image.scaleY - box.box[1] * State.image.scaleY,
                text: box.text,
                label: box.label
            })
        }
    }

    static createBox(args, callback) {
        let id = args.id !== undefined ? args.id : State.currentBoxId
        State.boxArray[id] =
            //Here we recreate boxes from objects
            {
                box: new fabric.Rect({
                    left: args.left,
                    top: args.top,
                    width: args.width,
                    height: args.height,
                    fill: args.label !== undefined ?
                        boxColors[args.label.toLowerCase()] !== undefined ?
                            boxColors[args.label.toLowerCase()] :
                            'rgb(220, 0, 0)' :
                        'rgb(220, 0, 0)',
                    opacity: 0.2,
                    id: id,
                    type: "box",
                    lockRotation: true,
                }),
                content: args.text !== undefined ? args.text : "",
                label: args.label !== undefined ? args.label : "",
                originLinks: [],
                destinationLinks: []
            }
        State.canvas.add(State.boxArray[id].box)
        BoxService.addBoxToList(State.boxArray[id])
        BoxService.createLinkButton(id, callback)
        State.boxArray[id].box.on("moving", event => {
            BoxService.updateLinkPositions(event)
        })

        State.boxArray[id].box.on("scaling", event => {
            BoxService.updateLinkPositions(event)
        })
        State.currentBoxId++

        return id
    }

    //When deleting a link, we reindex the links to avoid having a gap in the indices
    static reindexLinks(deletedId) {
        for (let box of State.boxArray) {
            if (box === undefined) {
                continue
            }
            for (let linkIndex in box.originLinks) {
                if (State.boxArray[box.box.id].originLinks[linkIndex] > deletedId) {
                    State.boxArray[box.box.id].originLinks[linkIndex]--
                }
            }
            for (let linkIndex in box.destinationLinks) {
                if (State.boxArray[box.box.id].destinationLinks[linkIndex] > deletedId) {
                    State.boxArray[box.box.id].destinationLinks[linkIndex]--
                }
            }
        }
    }

    //Same thing here
    static reindexBoxes(deletedId) {
        for (let boxIndex in State.boxArray) {
            if (State.boxArray[boxIndex].box.id > deletedId) {
                State.boxArray[boxIndex].box.id--
                State.boxArray[boxIndex].linkButton.id--
            }
        }
        State.boxArray.splice(deletedId, 1)

        LinkingService.reindexBoxes(deletedId)
        State.currentBoxId--
        //And we re render the box list
        document.getElementById("box-list").innerHTML = ""
        for (let box of State.boxArray) {
            if (box !== undefined) {
                BoxService.addBoxToList(box)
            }
        }
    }

    static changeLabel(idBox, label) {
        //Changing the colors according to the label
        document.getElementById("box-" + idBox).style.backgroundColor = boxColors[label]
        document.getElementById("label-" + idBox).value = label
        State.boxArray[idBox].box.set({fill: boxColors[label]})
        State.boxArray[idBox].label = label
        State.canvas.renderAll()
        State.canvas.historySaveAction()
    }

    static selectBox(box) {
        let selected = box
        if (selected !== null) {

            State.selectedBoxId = selected.id
            //We show again the link button and select the right box in the list
            BoxService.changeDrawLinkButtonVisibility(State.selectedBoxId, true)
            if (!State.showAllLinks) {
                LinkingService.changeLinksVisibility(State.selectedBoxId, true)
            }
            let box = document.getElementById(`box-${State.selectedBoxId}`)
            if (box !== null) {
                box.classList.add("box-selected")
                box.scrollIntoView()
            }
        }
    }
}