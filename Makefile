# Sanity
SHELL := bash
.ONESHELL:
.SHELLFLAGS := -eu -o pipefail -c
.DELETE_ON_ERROR:
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules

# Checks

ifeq ($(origin DUMMY_HOSTNAME),undefined)
  $(error DUMMY_HOSTNAME is not set)
endif

# Convenience targets

.PHONY: test
test:
	@echo Sorry, no tests yet

server.key server.crt:
	openssl req \
		-newkey rsa:2048 \
		-x509 \
		-nodes \
		-keyout server.key \
		-new \
		-out server.crt \
		-subj /CN=$(DUMMY_HOSTNAME) \
		-days 3650

.PHONY: serve
serve: server.crt server.key
	@npx http-server -S -C server.crt -K server.key

