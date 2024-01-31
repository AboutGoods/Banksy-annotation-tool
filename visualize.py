import json
import cv2
import sys
import matplotlib.pyplot as plt


if __name__ == '__main__':
    image_id = int(sys.argv[1])

    image_path = f"source/image_{image_id:03d}.jpg"
    annt = json.load(open(f"output/image_{image_id:03d}_output.json", 'r', encoding='utf-8'))

    color_map = {
        "header": (255, 102, 224, 0.5),
        "key": (128, 128, 240),
        "value": (205, 148, 79),
        "others": (0, 165, 255),
    }

    id2box = {}
    relation_lines = []

    img = cv2.imread(image_path)
    mask = img.copy()

    for entity in annt:
        text = entity["text"]
        box = list(map(int, entity["box"]))
        label = entity["label"]
        if label == "": # TODO
            print(f"id {entity['id']} has no label")
            continue
        linking = entity["linking"]
        id2box[entity["id"]] = box

        cv2.rectangle(mask, (box[0], box[1]), (box[2], box[3]), color_map[label], -1)
        for link in linking:
            p1 = link[0]
            p2 = link[1]
            if p1 in id2box and p2 in id2box:
                box1 = id2box[p1]
                box2 = id2box[p2]

                x1 = box1[0]
                y1 = box1[1]
                x2 = box2[0]
                y2 = box2[1]
                # line from center
                # x1 = int((box1[0] + box1[2]) / 2)
                # y1 = int((box1[1] + box1[3]) / 2)
                # x2 = int((box2[0] + box2[2]) / 2)
                # y2 = int((box2[1] + box2[3]) / 2)
                relation_lines.append([(x1, y1), (x2, y2)])
    
    alpha = 0.3
    img = cv2.addWeighted(img, 1 - alpha, mask, alpha, 0)
    for line in relation_lines:
        cv2.line(img, line[0], line[1], (0, 139, 69), 2)
    
    # cv2.namedWindow("img", cv2.WINDOW_NORMAL)
    # cv2.imshow("img", img)
    # cv2.waitKey(0)
    # cv2.destroyAllWindows()

    # use matplotlib to show image
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    plt.imshow(img)
    plt.show()

