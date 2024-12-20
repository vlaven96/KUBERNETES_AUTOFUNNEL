DOCKER_REPO := adicraciun
IMAGE_NAME := airtable-sync-controller
TAG := latest

.PHONY: build push deploy

build:
	docker build --platform=linux/amd64 -t $(DOCKER_REPO)/$(IMAGE_NAME):$(TAG) .

push:
	docker push $(DOCKER_REPO)/$(IMAGE_NAME):$(TAG)

deploy:
	./deploy.sh