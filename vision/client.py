from google.cloud import vision
from google.oauth2 import service_account
from google.protobuf.json_format import MessageToJson
import os, pathlib
import argparse

image_ext = ("*.jpg", "*.jpeg", "*.png")


class VisionClient:
    def __init__(self):
        credentials = service_account.Credentials.from_service_account_file(
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"]
        )
        self.client = vision.ImageAnnotatorClient(credentials=credentials)

    def send_request(self, image):
        try:
            image = vision.types.Image(content=image)
        except ValueError as e:
            print("Image could not be read")
            return
        response = self.client.document_text_detection(image, timeout=10)
        serialized = MessageToJson(
            response
        )  # https://github.com/googleapis/google-cloud-python/issues/3485#issuecomment-307797562
        return serialized


def find_images(folder):
    return [
        str(path)
        for ext in image_ext
        for path in pathlib.Path(os.path.realpath(folder)).rglob(ext)
    ]


def main():
    parser = argparse.ArgumentParser(
        description='Detect Text on Images using vision. Results will be written as "<image>.json"'
    )
    parser.add_argument(
        "image_directory", type=str, help="path to the directory containing the images"
    )
    args = parser.parse_args()

    # get the image path
    all_images = find_images(args.image_directory)
    # init the client
    vision_client = VisionClient()

    # do all the requests
    for image_path in all_images:
        img_name, _ = os.path.splitext(image_path)
        resp_name = "{}.json".format(img_name)
        with open(image_path, "rb") as image_file:
            content = image_file.read()

        try:
            resp_js = vision_client.send_request(content)
        except Exception as e:
            print("Image {} failed. Reason : {}".format(image_path, e))

        with open(resp_name, "w") as response:
            response.write(resp_js)


if __name__ == "__main__":
    main()
