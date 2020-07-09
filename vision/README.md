# Google Vision OCR Client

## 📃 Description

This is a small client to request Vision to ease the process of creating boxes around the text in the annotation tool.
It calls the Vision OCR API with the provided images, and returns the response in a JSON file, ready to use in the tool.

## 🔧 Getting Started

### Requirements

#### Using Conda

```shell
conda env create -f env.yml
```

#### Bare Metal

```shell
apt install python3 python3-pip
pip3 install google-cloud-vision
```

### Authentification

To call the Vison API, you need Google credentials in a json file. (See the [Google Documentation](https://cloud.google.com/docs/authentication/getting-started) to know how to get one).
Set up the environement variable "GOOGLE_APPLICATION_CREDENTIALS" to the json file storing your credentials, i.e

```shell
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"
```

### Launch

```shell
$ python client.py --help
usage: client.py [-h] image_directory

Detect Text on Images using vision. Results will be written as "<image>.json"

positional arguments:
  image_directory  path to the folder containing the images

optional arguments:
  -h, --help       show this help message and exit
```
