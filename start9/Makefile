# ArxMint — Start9 (StartOS) package build
# Usage: make build

REGISTRY ?= docker.io/arxmint
IMAGE    ?= arxmint
VERSION  ?= 0.5.0
TAG      := $(REGISTRY)/$(IMAGE):$(VERSION)

.PHONY: build push clean

build:
	docker build \
		--platform linux/amd64 \
		-t $(TAG) \
		-f ../Dockerfile \
		..

push: build
	docker push $(TAG)

clean:
	docker rmi $(TAG) || true
