import State from "./State.js"
import BoxService from "./BoxService.js"

const LINK_END_CIRCLE_RADIUS = 3

export default class LinkingService {

    static handleMouseDown(event) {

        State.isCreatingLink = true

        let pointer = State.canvas.getPointer(event.e);

        State.isMouseDown = true;
        State.mouseOriginX = pointer.x;
        State.mouseOriginY = pointer.y;

        let linkedBox = State.boxArray[event.target.id].box


        State.linkArray[State.currentLinkId] =
            //We create an object composed  of a line and a circle, the circle represents the direction of the link
            //The from and the to represents the IDs of the boxes that are linked to this link
            {
                link: new fabric.Line([linkedBox.getCenterPoint().x, linkedBox.getCenterPoint().y, linkedBox.getCenterPoint().x, linkedBox.getCenterPoint().y], {
                    id: State.currentLinkId,
                    type: "link",
                    selectable: false,
                    lockMovementX: true,
                    lockMovementY: true,
                    lockScalingX: true,
                    lockScalingY: true,
                    lockUniScaling: true,
                    lockRotation: true,
                    hasControls: false,
                    hoverCursor: "auto",
                    stroke: "rgb(100, 100, 100)",
                    opacity: 0.5,
                }),
                circle: new fabric.Circle({
                    left: linkedBox.getCenterPoint().x - LINK_END_CIRCLE_RADIUS,
                    top: linkedBox.getCenterPoint().y - LINK_END_CIRCLE_RADIUS,
                    id: State.currentLinkId,
                    radius: LINK_END_CIRCLE_RADIUS,
                    fill: 'rgb(100, 100, 100)',
                    opacity: 0.5,
                    lockMovementX: true,
                    lockMovementY: true,
                    lockScalingX: true,
                    lockScalingY: true,
                    lockUniScaling: true,
                    lockRotation: true,
                    type: "linkEndCircle",
                    hasControls: false
                }),
                from: State.canvas.getActiveObject().id,
                to: null
            }
        //And we add the objects to the canvas
        State.canvas.add(State.linkArray[State.currentLinkId].link);
        State.canvas.add(State.linkArray[State.currentLinkId].circle)

        LinkingService.hoverLink(State.linkArray[State.currentLinkId].link, State.linkArray[State.currentLinkId].circle)

        //Then hiding the link button for better visibility
        BoxService.changeDrawLinkButtonVisibility(linkedBox.id, false)
    }

    static handleMouseMove(event) {

        if (!State.isCreatingLink) {
            //Nothing to do if we're not creating a link
            return
        }


        let pointer = State.canvas.getPointer(event.e, true)

        for (let obj of State.canvas.getObjects()) {
            //Here we can't just get the hovered object, as this will almost always be returning the link object,
            // so we need to loop through all objects to see if the pointer coordinates inside the object area
            //(Yes this is not very efficient)
            if (obj.type === "box") {
                obj.opacity = 0.2

                if (obj.containsPoint(pointer) &&
                    obj.id !== State.linkArray[State.currentLinkId].from &&
                    !LinkingService.areBoxesLinked(obj.id, State.linkArray[State.currentLinkId].from)
                ) {

                    obj.opacity = 0.6
                    State.canvas.renderAll()
                }
            }
        }

        pointer = State.canvas.getPointer(event.e)

        let link = State.linkArray[State.currentLinkId].link
        let linkEndCircle = State.linkArray[State.currentLinkId].circle
        link.set({x2: pointer.x, y2: pointer.y})
        link.setCoords()
        linkEndCircle.set({left: pointer.x - LINK_END_CIRCLE_RADIUS, top: pointer.y - LINK_END_CIRCLE_RADIUS})
        linkEndCircle.setCoords()
    }

    static handleMouseUp(event) {
        if (!State.isCreatingLink) {
            //Nothing to do if we're not creating a link
            return
        }

        State.isCreatingLink = false

        let pointer = State.canvas.getPointer(event.e, true)

        for (let obj of State.canvas.getObjects()) {
            //Here we can't just get the hovered object, as this will almost always be returning the link object,
            // so we need to loop through all objects to see if the pointer coordinates inside the object area
            if (obj.containsPoint(pointer) &&
                obj.type === "box" &&
                obj.id !== State.linkArray[State.currentLinkId].from &&
                !LinkingService.areBoxesLinked(obj.id, State.linkArray[State.currentLinkId].from)
            ) {
                obj.opacity = 0.2
                State.boxArray[event.target.id].originLinks.push(State.currentLinkId)
                State.boxArray[obj.id].destinationLinks.push(State.currentLinkId)
                State.linkArray[State.currentLinkId].to = obj.id
                BoxService.changeDrawLinkButtonVisibility(State.selectedBoxId, false)
                if (!State.showAllLinks) {
                    LinkingService.changeLinksVisibility(State.selectedBoxId, false)
                }

                //We set the selected object on the canvas to the linked box
                State.canvas.setActiveObject(obj)
                let oldSelectedBox = document.getElementById(`box-${State.selectedBoxId}`)
                oldSelectedBox.classList.remove("box-selected")
                State.selectedBoxId = obj.id
                let newSelectedBox = document.getElementById(`box-${State.selectedBoxId}`)
                newSelectedBox.classList.add("box-selected")
                BoxService.changeDrawLinkButtonVisibility(State.selectedBoxId, true)
                if (!State.showAllLinks) {
                    LinkingService.changeLinksVisibility(State.selectedBoxId, true)
                }

                State.currentLinkId++
                return;
            }
        }

        State.canvas.remove(State.linkArray[State.currentLinkId].link)
        State.canvas.remove(State.linkArray[State.currentLinkId].circle)
        delete State.linkArray[State.currentLinkId]

    }

    static changeLinksVisibility(boxId, show) {
        if (show) {
            State.boxArray[boxId].originLinks.forEach(linkId => {
                State.canvas.add(State.linkArray[linkId].link)
                State.canvas.add(State.linkArray[linkId].circle)
            })
            State.boxArray[boxId].destinationLinks.forEach(linkId => {
                State.canvas.add(State.linkArray[linkId].link)
                State.canvas.add(State.linkArray[linkId].circle)
            })
            State.canvas.renderAll()
            return
        }
        State.boxArray[boxId].originLinks.forEach(linkId => {
            State.canvas.remove(State.linkArray[linkId].link)
            State.canvas.remove(State.linkArray[linkId].circle)
        })
        State.boxArray[boxId].destinationLinks.forEach(linkId => {
            State.canvas.remove(State.linkArray[linkId].link)
            State.canvas.remove(State.linkArray[linkId].circle)
        })
        State.canvas.renderAll()
    }

    static toggleAllLinksVisibility(show) {
        if (show) {
            State.linkArray.forEach(link => {
                State.canvas.add(link.link)
                State.canvas.add(link.circle)
            })
            return
        }
        State.linkArray.forEach(link => {
            State.canvas.remove(link.link)
            State.canvas.remove(link.circle)
        })
    }

    static deleteLink(id) {
        State.canvas.remove(State.linkArray[id].link)
        State.canvas.remove(State.linkArray[id].circle)

        BoxService.deleteLink(State.linkArray[id].from, id)
        BoxService.deleteLink(State.linkArray[id].to, id)

        delete State.linkArray[id]
        LinkingService.reindexLinks(id)
    }

    //Reindexing links to avoid having a gap between the IDs
    static reindexLinks(deletedId) {
        for (let linkIndex in State.linkArray) {
            if (State.linkArray[linkIndex].link.id > deletedId) {
                State.linkArray[linkIndex].link.id--
            }
        }
        State.linkArray.splice(deletedId, 1)
        BoxService.reindexLinks(deletedId)
        State.currentLinkId--
    }
    //Same
    static reindexBoxes(deletedId) {
        for (let linkIndex in State.linkArray) {
            if (State.linkArray[linkIndex].from > deletedId) {
                State.linkArray[linkIndex].from--
            }
            if (State.linkArray[linkIndex].to > deletedId) {
                State.linkArray[linkIndex].to--
            }
        }
    }

    static areBoxesLinked(id1, id2) {
        return State.linkArray.find(link => {
            return (link.from === id1 && link.to === id2) || (link.to === id1 && link.from === id2)
        }) !== undefined
    }

    static createLinksFromArray(objects) {
        for (let obj of objects) {
            if (!Array.isArray(obj.linking)) {
                return
            }
            //For each links, if they are not already created we recreate them, same as if we did it manually
            for (let link of obj.linking) {
                if (LinkingService.areBoxesLinked(link[0], link[1])) {
                    continue
                }
                State.linkArray[State.currentLinkId] =
                    {
                        link: new fabric.Line([
                            State.boxArray[link[0]].box.getCenterPoint().x,
                            State.boxArray[link[0]].box.getCenterPoint().y,
                            State.boxArray[link[1]].box.getCenterPoint().x,
                            State.boxArray[link[1]].box.getCenterPoint().y
                        ], {
                            id: State.currentLinkId,
                            type: "link",
                            selectable: false,
                            hasControls: false,
                            hoverCursor: "auto",
                            stroke: "rgb(100, 100, 100)",
                            opacity: 0.5,
                        }),
                        circle: new fabric.Circle({
                            left: State.boxArray[link[1]].box.getCenterPoint().x - LINK_END_CIRCLE_RADIUS,
                            top: State.boxArray[link[1]].box.getCenterPoint().y - LINK_END_CIRCLE_RADIUS,
                            id: State.currentLinkId,
                            radius: LINK_END_CIRCLE_RADIUS,
                            fill: 'rgb(100, 100, 100)',
                            opacity: 0.5,
                            lockMovementX: true,
                            lockMovementY: true,
                            lockScalingX: true,
                            lockScalingY: true,
                            lockUniScaling: true,
                            lockRotation: true,
                            selectable: false,
                            type: "linkEndCircle",
                            hasControls: false
                        }),
                        from: link[0],
                        to: link[1]
                    }

                State.canvas.add(State.linkArray[State.currentLinkId].link);
                State.canvas.add(State.linkArray[State.currentLinkId].circle);

                LinkingService.hoverLink(State.linkArray[State.currentLinkId].link, State.linkArray[State.currentLinkId].circle)

                State.boxArray[link[0]].originLinks.push(State.currentLinkId)
                State.boxArray[link[1]].destinationLinks.push(State.currentLinkId)
                State.currentLinkId++
            }
        }
    }

    static hoverLink(link, circle) {
        link.on("mouseover", e => {
            link.opacity = circle.opacity = 1
            State.canvas.renderAll()
        })
        link.on("mouseout", e => {
            link.opacity = circle.opacity = 0.5
            State.canvas.renderAll()
        })

        circle.on("mouseover", e => {
            link.opacity = circle.opacity = 1
            State.canvas.renderAll()
        })
        circle.on("mouseout", e => {
            link.opacity = circle.opacity = 0.5
            State.canvas.renderAll()
        })
    }

    static showModal(boxId) {
        State.currentLinksModalBoxId = boxId
        let modalContent = document.getElementById("links-modal-content")
        modalContent.innerHTML = ""

        let boxesSelectOptions = State.boxArray.map(box => `<option value='${box.box.id}'>${box.box.id}</option>`)

        for (let link of State.linkArray.filter(l => l.from === boxId || l.to === boxId)) {
            let htmlTemplate = `
            <div class="uk-card uk-card-default uk-margin-top" id='link-${link.link.id}'>
                <div class="uk-card-body uk-flex uk-flex-between uk-flex-middle">
                    <div>
                        <label for="from">From</label>
                        <select class="uk-select" id='link-from-${link.link.id}' name="from">
                        ${boxesSelectOptions}
                        </select>
                    </div>
                    <div>
                        <label for="to">To</label>
                        <select class="uk-select" id='link-to-${link.link.id}' name="to">
                        ${boxesSelectOptions}
                        </select>
                    </div>
                    <div>
                        <br />
                        <button class="uk-button uk-button-danger uk-button-small" id='link-remove-button-${link.link.id}'><span class="link-remove-button" uk-icon="close"></span></button>
                    </div>
                </div>
            </div>`

            let templateElement = document.createElement("template")
            templateElement.innerHTML = htmlTemplate.trim()

            modalContent.appendChild(templateElement.content.firstChild)

            let linkFrom = document.getElementById("link-from-" + link.link.id)
            let linkTo = document.getElementById("link-to-" + link.link.id)

            linkFrom.value = link.from
            linkTo.value = link.to

            linkFrom.addEventListener("change", (e) => {
                if (parseInt(e.target.value) === link.to) {
                    UIkit.notification("You can't link an entity with itself", {status: 'danger', pos: "bottom-center"})
                    return
                }
                if (parseInt(e.target.value) === link.from + '') {
                    return
                }

                if (LinkingService.areBoxesLinked(parseInt(e.target.value), link.to)) {
                    UIkit.notification("Those entities are already linked", {status: 'danger', pos: "bottom-center"})
                    return
                }

                State.boxArray[link.from].originLinks = State.boxArray[link.from].originLinks.filter(linkId => linkId !== link.link.id)
                State.boxArray[e.target.value].originLinks.push(link.link.id)

                link.from = parseInt(e.target.value)
                link.link.set({x1: State.boxArray[link.from].box.getCenterPoint().x, y1: State.boxArray[link.from].box.getCenterPoint().y})
                link.link.setCoords()

                State.canvas.renderAll()
                State.canvas.historySaveAction()
            })

            linkTo.addEventListener("change", (e) => {
                if (parseInt(e.target.value) === link.from) {
                    UIkit.notification("You can't link an entity with itself", {status: 'danger', pos: "bottom-center"})
                    return
                }
                if (parseInt(e.target.value) === link.to) {
                    return
                }

                if (LinkingService.areBoxesLinked(parseInt(e.target.value), link.from)) {
                    UIkit.notification("Those entities are already linked", {status: 'danger', pos: "bottom-center"})
                    return
                }

                State.boxArray[link.to].destinationLinks = State.boxArray[link.to].destinationLinks.filter(linkId => linkId !== link.link.id)
                State.boxArray[e.target.value].originLinks.push(link.link.id)

                link.to = parseInt(e.target.value)
                link.link.set({x2: State.boxArray[link.to].box.getCenterPoint().x, y2: State.boxArray[link.to].box.getCenterPoint().y})
                link.link.setCoords()

                State.canvas.renderAll()
                State.canvas.historySaveAction()
            })

            let removeButton = document.getElementById("link-remove-button-" + link.link.id)
            removeButton.addEventListener("click", () => {
                LinkingService.deleteLink(link.link.id)
                document.getElementById("link-" + link.link.id).remove()
                LinkingService.showModal(State.currentLinksModalBoxId)
                State.canvas.historySaveAction()
            })
        }
    }

}