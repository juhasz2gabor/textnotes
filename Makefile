
DIST_NAME := textnotes
DIST_NAME_BETA := textnotes-beta
DIST_PATH := dist/
SRC_PATH := textnotes/

help:
	@echo "make help       - Print this help"
	@echo "make clean      - Cleaning dist directory"
	@echo "make dist       - Creating xpi add-ons package"
	@echo "make dist-beta  - Creating xpi add-ons beta-package"

dist : clean
	cd ${SRC_PATH} && zip -r -FS ../${DIST_PATH}/${DIST_NAME}.zip *

dist-beta : clean
	cd ${SRC_PATH} && zip -r -FS ../${DIST_PATH}/${DIST_NAME_BETA}.zip *

clean :
	rm -rf ${DIST_PATH}/*
