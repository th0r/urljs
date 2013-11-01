(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.URL = factory();
    }
}(this, function () {
    'use strict';

    /*!
     * URL.js (modified version)
     *
     * Copyright 2011 Eric Ferraiuolo
     * https://github.com/ericf/urljs
     * 
     * Fork by th0r
     * https://github.com/th0r/urljs
     */

    var ABSOLUTE = 'absolute',
        RELATIVE = 'relative',

        TYPE = 'type',
        SCHEME = 'scheme',
        USER_INFO = 'userInfo',
        HOST = 'host',
        PORT = 'port',
        PATH = 'path',
        QUERY = 'query',
        QUERY_OBJ = 'queryObj',
        HASH = 'hash',

        URL_TYPE_REGEX = /^(?:(https?:\/\/|\/\/)|(\/|\?|#)|[^;:@=\.\s])/i,
        URL_ABSOLUTE_REGEX = /^(?:(https?):\/\/|\/\/)(?:([^:@\s]+:?[^:@\s]+?)@)?(localhost|(?:[^;:@=\/\?\.\s]+\.)+[A-Za-z0-9\-]{2,})(?::(\d+))?(?=\/|\?|#|$)([^\?#]+)?(?:\?([^#]+))?(?:#(.+))?/i,
        URL_RELATIVE_REGEX = /^([^\?#]+)?(?:\?([^#]+))?(?:#(.+))?/i,
        PLUS_SIGN_REGEX = /\+/g,

        OBJECT = 'object',
        STRING = 'string',
        TRIM_REGEX = /^\s+|\s+$/g,

        toString = Object.prototype.toString,

        URL, trim, isObject, isString, isArray, encodeQueryPart, decodeQueryPart;


    // *** Utilities *** //

    trim = String.prototype.trim ? function (s) {
        return ( s && s.trim ? s.trim() : s );
    } : function (s) {
        try {
            return s.replace(TRIM_REGEX, '');
        } catch(e) { return s; }
    };

    isObject = function (o) {
        return ( o && typeof o === OBJECT );
    };

    isString = function (o) {
        return typeof o === STRING;
    };

    isArray = function (o) {
        return toString.call(o) === '[object Array]';
    };

    encodeQueryPart = encodeURIComponent;

    decodeQueryPart = function (str) {
        return decodeURIComponent(str.replace(PLUS_SIGN_REGEX, '%20'));
    };

    /**
     * URL constructor and utility.
     * Provides support for validating whether something is a URL,
     * formats and cleans up URL-like inputs into something nice and pretty,
     * ability to resolve one URL against another and returned the formatted result,
     * and is a convenient API for working with URL Objects and the various parts of URLs.
     *
     * @constructor URL
     * @param       {String | URL}  url - the URL String to parse or URL instance to copy
     * @param       {Boolean}  [localResolve=true]
     * @return      {URL}           url - instance of a URL all nice and parsed
     */

    URL = function (url, localResolve) {
        var ctor,
            currentLocation;

        if (localResolve === false) {
            this._init(url);
        } else {
            ctor = this.constructor;
            currentLocation = (ctor.getCurrentLocation || URL.getCurrentLocation).call(ctor);

            return currentLocation.resolve(url);
        }
    };

    // *** Static *** //

    /**
     *
     */
    URL.ABSOLUTE = ABSOLUTE;

    /**
     *
     */
    URL.RELATIVE = RELATIVE;

    /**
     *
     */
    URL.normalize = function (url, localResolve) {
        return new this(url, localResolve).toString();
    };

    /**
     * Returns a resolved URL String using the baseUrl to resolve the url against.
     * This attempts to resolve URLs like a browser would on a web page.
     *
     * @static
     * @method  resolve
     * @param   {String | URL}  baseUrl     - the URL String, or URL instance as the resolving base
     * @param   {String | URL}  url         - the URL String, or URL instance to resolve
     * @return  {String}        resolvedUrl - a resolved URL String
     */
    URL.resolve = function (baseUrl, url) {
        return new this(baseUrl, false).resolve(url).toString();
    };

    URL.getCurrentLocation = function () {
        return new this(location.href, false);
    };


    // *** Prototype *** //

    URL.prototype = {

        constructor: URL,

        // *** Lifecycle Methods *** //

        /**
         * Initializes a new URL instance, or re-initializes an existing one.
         * The URL constructor delegates to this method to do the initializing,
         * and the mutator instance methods call this to re-initialize when something changes.
         *
         * @protected
         * @method  _init
         * @param   {String | URL}  url - the URL String, or URL instance
         * @return  {URL}           url - instance of a URL all nice and parsed/re-parsed
         */
        _init: function (url) {

            url = isString(url) ? url : url instanceof URL ? url.toString() : null;

            this._original = url;
            this._url = {};
            this._isValid = this._parse(url);

            return this;
        },

        // *** Object Methods *** //

        /**
         * Returns the formatted URL String.
         * Overridden Object toString method to do something useful.
         *
         * @public
         * @method  toString
         * @return  {String}    url - formatted URL string
         */
        toString: function () {

            var url = this._url,
                urlParts = [],
                type = url[TYPE],
                scheme = url[SCHEME],
                path = url[PATH],
                query = this.queryString(),
                hash = url[HASH];

            if (type === ABSOLUTE) {
                urlParts.push(
                    scheme ? (scheme + ':' + '//') : '//',
                    this.authority()
                );
                if (path && path.indexOf('/') !== 0) {    // this should maybe go in _set
                    path = '/' + path;
                }
            }

            urlParts.push(
                path,
                query ? ('?' + query) : '',
                hash ? ('#' + hash) : ''
            );

            return urlParts.join('');
        },

        // *** Accessor/Mutator Methods *** //

        original: function () {
            return this._original;
        },

        /**
         * Whether parsing from initialization or re-initialization produced something valid.
         *
         * @public
         * @method  isValid
         * @return  {Boolean}   valid   - whether the URL is valid
         */
        isValid: function () {
            return this._isValid;
        },

        /**
         * URL is absolute if it has a scheme or is scheme-relative (//).
         *
         * @public
         * @method  isAbsolute
         * @return  {Boolean}   absolute    - whether the URL is absolute
         */
        isAbsolute: function () {
            return this._url[TYPE] === ABSOLUTE;
        },

        /**
         * URL is relative if it host or path relative, i.e. doesn't contain a host.
         *
         * @public
         * @method  isRelative
         * @return  {Boolean}   relative    - whether the URL is relative
         */
        isRelative: function () {
            return this._url[TYPE] === RELATIVE;
        },

        /**
         * URL is host relative if it's relative and the path begins with '/'.
         *
         * @public
         * @method  isHostRelative
         * @return  {Boolean}   hostRelative    - whether the URL is host-relative
         */
        isHostRelative: function () {
            var path = this._url[PATH];
            return ( this.isRelative() && path && path.indexOf('/') === 0 );
        },

        isLocal: function () {
            if (!this.isValid()) {
                return false;
            }

            if (this.isRelative()) {
                return true;
            }

            return (this.origin() === this.constructor.getCurrentLocation().origin());
        },

        /**
         * Returns the type of the URL, either: URL.ABSOLUTE or URL.RELATIVE.
         *
         * @public
         * @method  type
         * @return  {String}    type    - the type of the URL: URL.ABSOLUTE or URL.RELATIVE
         */
        type: function () {
            return this._url[TYPE];
        },

        /**
         * Returns or sets the scheme of the URL.
         * If URL is determined to be absolute (i.e. contains a host) and no scheme is provided,
         * the scheme will default to http.
         *
         * @public
         * @method  scheme
         * @param   {String}        [scheme]  - Optional scheme to set on the URL
         * @return  {String | URL}  the URL scheme or the URL instance
         */
        scheme: function (scheme) {
            return ( arguments.length ? this._set(SCHEME, scheme) : this._url[SCHEME] );
        },

        /**
         * Returns or set the user info of the URL.
         * The user info can optionally contain a password and is only valid for absolute URLs.
         *
         * @public
         * @method  userInfo
         * @param   {String}        [userInfo]    - Optional userInfo to set on the URL
         * @return  {String | URL}  the URL userInfo or the URL instance
         */
        userInfo: function (userInfo) {
            return ( arguments.length ? this._set(USER_INFO, userInfo) : this._url[USER_INFO] );
        },

        /**
         * Returns or sets the host of the URL.
         * The host name, if set, must be something valid otherwise the URL will become invalid.
         *
         * @public
         * @method  host
         * @param   {String}        [host]    - Optional host to set on the URL
         * @return  {String | URL}  the URL host or the URL instance
         */
        host: function (host) {
            return ( arguments.length ? this._set(HOST, host) : this._url[HOST] );
        },

        /**
         * Returns the URL's domain, where the domain is the TLD and SLD of the host.
         * e.g. foo.example.com -> example.com
         *
         * @public
         * @method  domain
         * @return  {String}    domain  - the URL domain
         */
        domain: function () {
            var host = this._url[HOST];
            return ( host ? host.split('.').slice(-2).join('.') : undefined );
        },

        /**
         * Returns or sets the port of the URL.
         *
         * @public
         * @method  port
         * @param   {Number}        [port]    - Optional port to set on the URL
         * @return  {Number | URL}  the URL port or the URL instance
         */
        port: function (port) {
            return ( arguments.length ? this._set(PORT, port) : this._url[PORT] );
        },

        origin: function () {
            var port;

            if (this.isValid() && this.isAbsolute()) {
                port = this.port();

                return this.scheme() + '://' + this.host() + (port ? ':' + port : '');
            } else {
                return null;
            }
        },

        /**
         * Returns the URL's authority which is the userInfo, host, and port combined.
         * This only makes sense for absolute URLs
         *
         * @public
         * @method  authority
         * @return  {String}    authority   - the URL's authority (userInfo, host, and port)
         */
        authority: function () {

            var url = this._url,
                userInfo = url[USER_INFO],
                host = url[HOST],
                port = url[PORT];

            return [

                userInfo ? (userInfo + '@') : '',
                host,
                port ? (':' + port) : ''

            ].join('');
        },

        /**
         * Returns or sets the path of the URL.
         *
         * @public
         * @method  path
         * @param   {String}        [path]    - Optional path to set on the URL
         * @return  {String | URL}  the URL path or the URL instance
         */
        path: function (path) {
            return ( arguments.length ? this._set(PATH, path) : this._url[PATH] );
        },

        query: function (key, value) {
            var argsLen = arguments.length,
                url = this._url;

            if (argsLen === 2) {
                // Set query parameter value
                this._getQueryObject()[key] = value;
                url[QUERY] = null;

                return this;
            }

            if (argsLen === 1) {
                if (isString(key)) {
                    // Get query parameter value
                    return this._getQueryObject()[key];
                } else {
                    // Set query object
                    url[QUERY_OBJ] = key;
                    url[QUERY] = null;

                    return this;
                }
            }

            // Get query object
            return this._getQueryObject();
        },

        /**
         * Returns or sets the query of the URL.
         * This takes or returns the query as a String; doesn't include the '?'
         *
         * @public
         * @method  queryString
         * @param   {String}        [queryString] - Optional queryString to set on the URL
         * @return  {String | URL}  the URL queryString or the URL instance
         */
        queryString: function (queryString) {
            var url = this._url;

            if (arguments.length) {
                // Set query string
                url[QUERY] = queryString;
                url[QUERY_OBJ] = null;

                return this;
            } else {
                // Get query string
                if (url[QUERY] === null) {
                    url[QUERY] = this._makeQueryString(url[QUERY_OBJ]);
                }

                return url[QUERY];
            }
        },

        /**
         * Returns or sets the hash on the URL.
         * The hash does not contain the '#'.
         *
         * @public
         * @method  hash
         * @param   {String}        [hash]    - Optional hash to set on the URL
         * @return  {String | URL}  the URL hash or the URL instance
         */
        hash: function (hash) {
            return ( arguments.length ? this._set(HASH, hash) : this._url[HASH] );
        },

        /**
         * Returns a new, resolved URL instance using this as the baseUrl.
         * The URL passed in will be resolved against the baseUrl.
         *
         * @public
         * @method  resolve
         * @param   {String | URL}  url - the URL String, or URL instance to resolve
         * @return  {URL}           url - a resolved URL instance
         */
        resolve: function (url) {

            url = (url instanceof URL) ? url : new this.constructor(url, false);

            var resolved, path;

            if (!(this.isValid() && url.isValid())) { return this; } // not sure what to do???

            // the easy way
            if (url.isAbsolute()) {
                return ( this.isAbsolute() ? url.scheme() ? url : new this.constructor(url, false).scheme(this.scheme()) : url );
            }

            // the hard way
            resolved = new this.constructor(this.isAbsolute() ? this : null, false);

            if (url.path()) {

                if (url.isHostRelative() || !this.path()) {
                    path = url.path();
                } else {
                    path = this.path().substring(0, this.path().lastIndexOf('/') + 1) + url.path();
                }

                resolved.path(this._normalizePath(path)).queryString(url.queryString()).hash(url.hash());

            } else if (url.queryString()) {
                resolved.queryString(url.queryString()).hash(url.hash());
            } else if (url.hash()) {
                resolved.hash(url.hash());
            }

            return resolved;
        },

        /**
         * Returns a new, reduced relative URL instance using this as the baseUrl.
         * The URL passed in will be compared to the baseUrl with the goal of
         * returning a reduced-down URL to one that’s relative to the base (this).
         * This method is basically the opposite of resolve.
         *
         * @public
         * @method  reduce
         * @param   {String | URL}  url - the URL String, or URL instance to resolve
         * @return  {URL}           url - the reduced URL instance
         */
        reduce: function (url) {

            url = (url instanceof URL) ? url : new this.constructor(url, false);

            var reduced = this.resolve(url);

            if (this.isAbsolute() && reduced.isAbsolute()) {
                if (reduced.scheme() === this.scheme() && reduced.authority() === this.authority()) {
                    reduced.scheme(null).userInfo(null).host(null).port(null);
                }
            }

            return reduced;
        },

        // *** Private Methods *** //

        /**
         * Parses a URL into usable parts.
         * Reasonable defaults are applied to parts of the URL which weren't present in the input,
         * e.g. 'http://example.com' -> { type: 'absolute', scheme: 'http', host: 'example.com', path: '/' }
         * If nothing or a falsy value is returned, the URL wasn't something valid.
         *
         * @private
         * @method  _parse
         * @param   {String}    url     - the URL string to parse
         * @param   {String}    [type]    - Optional type to seed parsing: URL.ABSOLUTE or URL.RELATIVE
         * @return  {Boolean}   parsed  - whether or not the URL string was parsed
         */
        _parse: function (url, type) {

            // make sure we have a good string
            url = trim(url);
            if (!(isString(url) && url.length > 0)) {
                return false;
            }

            var urlParts, parsed;

            // figure out type, absolute or relative, or quit
            if (!type) {
                type = url.match(URL_TYPE_REGEX);
                type = type ? type[1] ? ABSOLUTE : type[2] ? RELATIVE : null : null;
            }

            switch (type) {

                case ABSOLUTE:
                    urlParts = url.match(URL_ABSOLUTE_REGEX);
                    if (urlParts) {
                        parsed = {};
                        parsed[TYPE] = ABSOLUTE;
                        parsed[SCHEME] = urlParts[1] ? urlParts[1].toLowerCase() : undefined;
                        parsed[USER_INFO] = urlParts[2];
                        parsed[HOST] = urlParts[3].toLowerCase();
                        parsed[PORT] = urlParts[4] ? parseInt(urlParts[4], 10) : undefined;
                        parsed[PATH] = urlParts[5] || '/';
                        parsed[QUERY] = urlParts[6] || '';
                        parsed[HASH] = urlParts[7];
                    }
                    break;

                case RELATIVE:
                    urlParts = url.match(URL_RELATIVE_REGEX);
                    if (urlParts) {
                        parsed = {};
                        parsed[TYPE] = RELATIVE;
                        parsed[PATH] = urlParts[1];
                        parsed[QUERY] = urlParts[2] || '';
                        parsed[HASH] = urlParts[3];
                    }
                    break;

                // try to parse as absolute, if that fails then as relative
                default:
                    return ( this._parse(url, ABSOLUTE) || this._parse(url, RELATIVE) );

            }

            if (parsed) {
                parsed[QUERY_OBJ] = null;
                this._url = parsed;
                return true;
            } else {
                return false;
            }
        },

        /**
         * Helper to parse a URL query string into an array of arrays.
         * Order of the query paramerters is maintained, an example structure would be:
         * queryString: 'foo=bar&baz' -> [['foo', 'bar'], ['baz']]
         *
         * @private
         * @method  _parseQuery
         * @param   {String}    queryString - the query string to parse, should not include '?'
         * @return  {Array}     parsedQuery - array of arrays representing the query parameters and values
         */
        _parseQueryString: function (queryString) {
            var queryObj = {},
                queryParts = queryString.split('&'),
                queryPart,
                key,
                value,
                valueIndex,
                i = 0,
                len = queryParts.length;

            for (; i < len; i++) {
                queryPart = queryParts[i];
                valueIndex = queryPart.indexOf('=');
                key = decodeQueryPart(queryPart.slice(0, valueIndex));
                if (key) {
                    value = decodeQueryPart(queryPart.slice(valueIndex + 1));
                    if (queryObj.hasOwnProperty(key)) {
                        if (isArray(queryObj[key])) {
                            queryObj[key].push(value);
                        } else {
                            queryObj[key] = [queryObj[key], value];
                        }
                    } else {
                        queryObj[key] = value;
                    }
                }
            }

            return queryObj;
        },

        _makeQueryString: function (queryObj) {
            var parts = [],
                key,
                value,
                i,
                len;

            for (key in queryObj) {
                if (queryObj.hasOwnProperty(key)) {
                    value = queryObj[key];
                    key = encodeQueryPart(key);

                    if (isArray(value)) {
                        for (i = 0, len = value.length; i < len; i++) {
                            parts.push(key + '=' + encodeQueryPart(value[i]));
                        }
                    } else {
                        parts.push(key + '=' + encodeQueryPart(value));
                    }
                }
            }

            return parts.join('&');
        },

        _getQueryObject: function () {
            var url = this._url;

            if (url[QUERY_OBJ] === null) {
                url[QUERY_OBJ] = this._parseQueryString(url[QUERY]);
            }

            return url[QUERY_OBJ];
        },

        /**
         * Helper for mutators to set a new URL-part value.
         * After the URL-part is updated, the URL will be toString'd and re-parsed.
         * This is a brute, but will make sure the URL stays in sync and is re-validated.
         *
         * @private
         * @method  _set
         * @param   {String}    urlPart - the _url Object member String name
         * @param   {Object}    val     - the new value for the URL-part, mixed type
         * @return  {URL}       this    - returns this URL instance, chainable
         */
        _set: function (urlPart, val) {

            this._url[urlPart] = val;

            if (val && (
                urlPart === SCHEME ||
                    urlPart === USER_INFO ||
                    urlPart === HOST ||
                    urlPart === PORT        )) {
                this._url[TYPE] = ABSOLUTE; // temp, set this to help clue parsing
            }
            if (!val && urlPart === HOST) {
                this._url[TYPE] = RELATIVE; // temp, no host means relative
            }

            this._isValid = this._parse(this.toString());

            return this;
        },

        /**
         * Returns a normalized path String, by removing ../'s.
         *
         * @private
         * @method  _normalizePath
         * @param   {String}    path            — the path String to normalize
         * @return  {String}    normalizedPath  — the normalized path String
         */
        _normalizePath: function (path) {

            var pathParts, pathPart, pathStack, normalizedPath, i, len;

            if (path.indexOf('../') > -1) {

                pathParts = path.split('/');
                pathStack = [];

                for (i = 0, len = pathParts.length; i < len; i++) {
                    pathPart = pathParts[i];
                    if (pathPart === '..') {
                        pathStack.pop();
                    } else if (pathPart) {
                        pathStack.push(pathPart);
                    }
                }

                normalizedPath = pathStack.join('/');

                // prepend slash if needed
                if (path[0] === '/') {
                    normalizedPath = '/' + normalizedPath;
                }

                // append slash if needed
                if (path[path.length - 1] === '/' && normalizedPath.length > 1) {
                    normalizedPath += '/';
                }

            } else {

                normalizedPath = path;

            }

            return normalizedPath;
        }

    };

    return URL;

}));