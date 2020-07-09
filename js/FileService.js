import State from "./State.js"
import BoxService from "./BoxService.js"
import LinkingService from "./LinkingService.js"

export default class FileService {

    static getImageFilePath() {
        return "/source/" + FileService.getImageName() + ".jpg"
    }
    static getJsonFilePath() {
        return "/source/" + FileService.getImageName() + ".json"
    }

    static getImageName() {
        return "image_" + ('00' + State.currentFileNumber).slice(-3)
    }

    static generateJsonString() {
        let entities = []
        for (let box of State.boxArray) {
            if (box === undefined) {
                continue
            }
            //For each boxes we check every links that it's linked to and add it to its list of links
            let fromLinks = box.originLinks.map(link => [State.linkArray[link].from, State.linkArray[link].to]).filter(link => link !== null)
            let toLinks = box.destinationLinks.map(link => [State.linkArray[link].from, State.linkArray[link].to]).filter(link => link !== null)
            let boxObj = box.box
            entities.push({
                id: boxObj.id,
                text: box.content,
                label: box.label,
                box: [
                    //Don't forget to scale the boxes coordinates to the image true size
                    parseFloat(Number(((boxObj.aCoords.tl.x * 1000) / (State.image.scaleX * 1000))).toFixed(2)),
                    parseFloat(Number(((boxObj.aCoords.tl.y * 1000) / (State.image.scaleY * 1000))).toFixed(2)),
                    parseFloat(Number((((boxObj.aCoords.tl.x + boxObj.width) * 1000) / (State.image.scaleX * 1000))).toFixed(2)),
                    parseFloat(Number((((boxObj.aCoords.tl.y + boxObj.height) * 1000) / (State.image.scaleY * 1000))).toFixed(2))
                ],
                linking: [...fromLinks, ...toLinks]
            })
        }

        return JSON.stringify(entities)
    }


    static loadJson() {
        let req = new XMLHttpRequest()
        req.open("GET", FileService.getJsonFilePath(),false)
        req.send()
        if (req.status === 404) {
            return
        }

        let objects = JSON.parse(req.responseText);
        let boxObjects = FileService.parseVisionResponse(objects)

        BoxService.createBoxesFromArray(boxObjects)
    }

    static loadFromJsonString(str) {
        let objects = JSON.parse(str)
        //Creating the boxes and links
        BoxService.createBoxesFromArray(objects)
        LinkingService.createLinksFromArray(objects)
    }

    static parseVisionResponse(obj) {
        let boxObjects = []
        //We start at 1 because the 1st object is a concatenation of all the strings
        for (let i = 1; i < obj.textAnnotations.length; i++) {

            //We need to do that because vision sometimes reverse the left and right coords so then we have negative
            // width which causes problems when drawing link buttons
            let leftX = obj.textAnnotations[i].boundingPoly.vertices[1].x > obj.textAnnotations[i].boundingPoly.vertices[3].x ?
                obj.textAnnotations[i].boundingPoly.vertices[3].x :
                obj.textAnnotations[i].boundingPoly.vertices[1].x
            let rightX = obj.textAnnotations[i].boundingPoly.vertices[1].x > obj.textAnnotations[i].boundingPoly.vertices[3].x ?
                obj.textAnnotations[i].boundingPoly.vertices[1].x :
                obj.textAnnotations[i].boundingPoly.vertices[3].x
            boxObjects.push({
                id: i - 1,
                text: obj.textAnnotations[i].description,
                box: [
                    leftX,
                    obj.textAnnotations[i].boundingPoly.vertices[1].y,
                    rightX,
                    obj.textAnnotations[i].boundingPoly.vertices[3].y
                ],
                label: "",
                linking: []
            })
        }
        return boxObjects
    }
}