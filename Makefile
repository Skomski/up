
TESTS = test/up.js
REPORTER = tap

test:
	@./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		--slow 1000ms \
		--bail \
		--growl \
		$(TESTS)

.PHONY: test

