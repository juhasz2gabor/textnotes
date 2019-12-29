
DIST_NAME := textnotes
DIST_PATH := dist/
SRC_PATH := textnotes/

help:
	@echo "make help       - Print this help"
	@echo "make clean      - Cleaning dist directory"
	@echo "make dist       - Creating xpi add-ons package"

dist : clean
	cd ${SRC_PATH} && zip -r -FS ../${DIST_PATH}/${DIST_NAME}.zip *

clean :
	rm -rf ${DIST_PATH}/*
