export default class State {

    static canvas = null

    static boxArray = []
    static linkArray = []
    static currentBoxId = 0
    static currentLinkId = 0
    static isManagingBox = false
    static isCreatingBox = false
    static isCreatingLink = false
    static isMovingViewport = false
    static showAllLinks = true
    static mergingMode = false

    static selectedBoxId = null
    static hoverBox = false
    static isMouseDown = false
    static mouseOriginX = 0
    static mouseOriginY = 0
    static currentFileNumber = 0

    static currentLinksModalBoxId = null

    static saveAlert = false
    static image = null

    static resetState() {
        State.currentLinkId = 0
        State.currentBoxId = 0
        State.boxArray = []
        State.linkArray = []
        State.selectedBoxId = null
        State.saveAlert = false
    }
}

