
DIST_NAME := textnotes
DIST_NAME_RC := textnotes-rc
DIST_PATH := dist/
SRC_PATH := textnotes/

help:
	@echo "make help       - Print this help"
	@echo "make clean      - Cleaning dist directory"
	@echo "make dist       - Creating xpi add-ons package"
	@echo "make dist-rc    - Creating xpi add-ons rc-package"

dist : clean
	cd ${SRC_PATH} && zip -r -FS ../${DIST_PATH}/${DIST_NAME}.zip *

dist-rc : clean
	cd ${SRC_PATH} && zip -r -FS ../${DIST_PATH}/${DIST_NAME_RC}.zip *

clean :
	rm -rf ${DIST_PATH}/*
