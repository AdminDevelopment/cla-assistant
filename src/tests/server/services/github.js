/*global describe, it, beforeEach, afterEach*/

// unit test
var rewire = require('rewire');
var assert = require('assert');
var sinon = require('sinon');

// config
global.config = require('../../../config');

// service
var github = rewire('../../../server/services/github');
var cache = require('memory-cache');

var callStub = sinon.stub();
var authenticateStub = sinon.stub();
var getNextPageStub = sinon.stub();

describe('github:call', function() {
    function GitHubApiMock(args) {

        assert.deepEqual(args, {
            protocol: 'https',
            version: '3.0.0',
            host: 'api.github.com',
            pathPrefix: null
        });

        this.obj = {
            fun: callStub
        };

        this.authenticate = authenticateStub;

        this.hasNextPage = function(link) {
            return link;
        };

        this.getNextPage = getNextPageStub;
    }

    github.__set__('GitHubApi', GitHubApiMock);

    beforeEach(function() {
        callStub.reset();
        authenticateStub.reset();
        getNextPageStub.reset();
        cache.clear();
    });

    it('should return an error if obj is not set', function(it_done) {
        github.call({}, function(err) {
            assert.equal(err, 'obj required/obj not found');
            it_done();
        });
    });

    it('should return an error if fun is not set', function(it_done) {
        github.call({ obj: 'obj' }, function(err) {
            assert.equal(err, 'fun required/fun not found');
            it_done();
        });
    });

    it('should authenticate when token is set', function(it_done) {
        callStub.yields(null, {});
        github.call({ obj: 'obj', fun: 'fun', token: 'token' }, function() {
            assert(authenticateStub.calledWith({
                type: 'oauth',
                token: 'token'
            }));
            it_done();
        });
    });

    it('should authenticate when basic authentication is required', function(it_done) {
        callStub.yields(null, {});
        github.call({ obj: 'obj', fun: 'fun', basicAuth: { user: 'user', pass: 'pass' } }, function() {
            assert(authenticateStub.calledWith({
                type: 'basic',
                username: 'user',
                password: 'pass'
            }));
            it_done();
        });
    });

    it('should not authenticate when neither token nor basicAuth are provided', function(it_done) {
        callStub.yields(null, {});
        github.call({ obj: 'obj', fun: 'fun' }, function() {
            assert(authenticateStub.notCalled);
            it_done();
        });
    });

    it('should call the appropriate function on the github api', function(it_done) {
        callStub.yields(null, {});
        github.call({ obj: 'obj', fun: 'fun' }, function(err, res, meta) {
            assert.equal(err, null);
            assert.deepEqual(res, {});
            assert.equal(meta, null);
            it_done();
        });
    });

    it('should call the appropriate function on the github api with meta', function(it_done) {
        callStub.yields(null, { meta: { link: null, 'x-oauth-scopes': [] } });
        github.call({ obj: 'obj', fun: 'fun' }, function(err, res, meta) {
            assert.equal(err, null);
            assert.deepEqual(res, {});
            assert.deepEqual(meta, {
                link: null,
                hasMore: false,
                scopes: []
            });
            it_done();
        });
    });

    it('should call the appropriate function on the github api with meta and link', function(it_done) {
        callStub.yields(null, { meta: { link: 'link', 'x-oauth-scopes': [] } });
        getNextPageStub.yields(null, { meta: { link: null, 'x-oauth-scopes': [] } });
        github.call({ obj: 'obj', fun: 'fun' }, function(err, res, meta) {
            assert.equal(err, null);
            assert.deepEqual(res, {});
            assert(getNextPageStub.called);
            // assert.deepEqual(meta, {
            //     link: 'link',
            //     hasMore: true,
            //     scopes: []
            // });
            it_done();
        });
    });

    it('should return github error', function(it_done) {
        callStub.yields('github error', null);
        github.call({ obj: 'obj', fun: 'fun' }, function(err, res, meta) {
            assert.equal(err, 'github error');
            assert.equal(res, null);
            assert.equal(meta, null);
            it_done();
        });
    });
});
