'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* global OT */

/** Dependencies */
var _require = require('./errors'),
    CoreError = _require.CoreError;

var _require2 = require('./util'),
    dom = _require2.dom,
    path = _require2.path,
    pathOr = _require2.pathOr,
    properCase = _require2.properCase;

var _require3 = require('./logging'),
    message = _require3.message,
    logAction = _require3.logAction,
    logVariation = _require3.logVariation;

/**
 * Default UI propties
 * https://tokbox.com/developer/guides/customize-ui/js/
 */


var defaultCallProperties = {
  insertMode: 'append',
  width: '100%',
  height: '100%',
  showControls: false,
  style: {
    buttonDisplayMode: 'off'
  }
};

var Communication = function Communication(options) {
  _classCallCheck(this, Communication);

  _initialiseProps.call(this);

  this.validateOptions(options);
  this.setSession();
  this.createEventListeners();
}
/**
 * Trigger an event through the API layer
 * @param {String} event - The name of the event
 * @param {*} [data]
 */


/**
 * Determine whether or not the party is able to join the call based on
 * the specified connection limit, if any.
 * @return {Boolean}
 */


/**
 * Create a publisher object
 * @param {string} source
 * @param {Object} publisherProperties
 * @returns {Promise} <resolve: Object, reject: Error>
 */


/**
 * Publish the local stream from source and update state
 * @param {string} source
 * @param {Object} publisherProperties
 * @returns {Promise} <resolve: empty, reject: Error>
 */


/**
 * Subscribe to a stream and update the state
 * @param {Object} stream - An OpenTok stream object
 * @param {Object} [subsriberOptions]
 * @param {Boolean} [networkTest] - Are we subscribing to our own publisher for a network test?
 * @returns {Promise} <resolve: Object, reject: Error >
 */


/**
 * Unsubscribe from a stream and update the state
 * @param {Object} subscriber - An OpenTok subscriber object
 * @returns {Promise} <resolve: empty>
 */


/**
 * Set session in module scope
 */


/**
 * Subscribe to new stream unless autoSubscribe is set to false
 * @param {Object} stream
 */


/**
 * Update state and trigger corresponding event(s) when stream is destroyed
 * @param {Object} stream
 */


/**
 * Listen for API-level events
 */


/**
 * Start publishing the local camera feed and subscribing to streams in the session
 * @param {string} source
 * @param {Object} publisherProperties
 * @returns {Promise} <resolve: Object, reject: Error>
 */


/**
 * Stop publishing and unsubscribe from all streams
 */


/**
 * Enable/disable local audio or video
 * @param {String} source - 'audio' or 'video'
 * @param {Boolean} enable
 * @param {String} streamSource - 'camera' or 'custom'
 */


/**
 * Enable/disable remote audio or video
 * @param {String} subscriberId
 * @param {String} source - 'audio' or 'video'
 * @param {Boolean} enable
 */


/**
 * Update the call properties for a publisher
 * @properties {Object} properties - An call properties object
 */
;

var _initialiseProps = function _initialiseProps() {
  var _this = this;

  Object.defineProperty(this, 'validateOptions', {
    enumerable: true,
    writable: true,
    value: function value(options) {
      var requiredOptions = ['core', 'state', 'analytics'];
      requiredOptions.forEach(function (option) {
        if (!options[option]) {
          throw new CoreError(option + ' is a required option.', 'invalidParameters');
        }
      });
      var callProperties = options.callProperties,
          screenProperties = options.screenProperties,
          autoSubscribe = options.autoSubscribe,
          subscribeOnly = options.subscribeOnly;

      _this.active = false;
      _this.core = options.core;
      _this.state = options.state;
      _this.analytics = options.analytics;
      _this.streamContainers = options.streamContainers;
      _this.callProperties = Object.assign({}, defaultCallProperties, callProperties);
      _this.connectionLimit = options.connectionLimit || null;
      _this.autoSubscribe = options.hasOwnProperty('autoSubscribe') ? autoSubscribe : true;
      _this.subscribeOnly = options.hasOwnProperty('subscribeOnly') ? subscribeOnly : false;
      _this.screenProperties = Object.assign({}, defaultCallProperties, { videoSource: 'window' }, screenProperties);
    }
  });
  Object.defineProperty(this, 'triggerEvent', {
    enumerable: true,
    writable: true,
    value: function value(event, data) {
      return _this.core.triggerEvent(event, data);
    }
  });
  Object.defineProperty(this, 'ableToJoin', {
    enumerable: true,
    writable: true,
    value: function value() {
      var connectionLimit = _this.connectionLimit,
          state = _this.state;

      if (!connectionLimit) {
        return true;
      }
      // Not using the session here since we're concerned with number of active publishers
      var connections = Object.values(state.getStreams()).filter(function (s) {
        return s.videoType === 'camera';
      });
      return connections.length < connectionLimit;
    }
  });
  Object.defineProperty(this, 'createPublisher', {
    enumerable: true,
    writable: true,
    value: function value(source, publisherProperties) {
      var callProperties = _this.callProperties,
          streamContainers = _this.streamContainers;

      return new Promise(function (resolve, reject) {
        // TODO: Handle adding 'name' option to props
        var props = Object.assign({}, callProperties, publisherProperties);
        // TODO: Figure out how to handle common vs package-specific options
        // ^^^ This may already be available through package options
        var container = dom.element(streamContainers('publisher', source));
        var publisher = OT.initPublisher(container, props, function (error) {
          error ? reject(error) : resolve(publisher);
        });
      });
    }
  });
  Object.defineProperty(this, 'publish', {
    enumerable: true,
    writable: true,
    value: function value(source, publisherProperties) {
      var analytics = _this.analytics,
          state = _this.state,
          createPublisher = _this.createPublisher,
          session = _this.session,
          triggerEvent = _this.triggerEvent,
          subscribeOnly = _this.subscribeOnly;

      /**
       * For subscriber tokens or cases where we just don't want to be seen or heard.
       */

      if (subscribeOnly) {
        message('Instance is configured with subscribeOnly set to true. Cannot publish to session');
        return Promise.resolve();
      }

      return new Promise(function (resolve, reject) {
        var onPublish = function onPublish(publisher) {
          return function (error) {
            if (error) {
              reject(error);
              analytics.log(logAction.startCall, logVariation.fail);
            } else {
              analytics.log(logAction.startCall, logVariation.success);
              state.addPublisher(source, publisher);
              resolve(publisher);
            }
          };
        };

        var publishToSession = function publishToSession(publisher) {
          return session.publish(publisher, onPublish(publisher));
        };

        var handleError = function handleError(error) {
          analytics.log(logAction.startCall, logVariation.fail);
          var errorMessage = error.code === 1010 ? 'Check your network connection' : error.message;
          triggerEvent('error', errorMessage);
          reject(error);
        };

        createPublisher(source, publisherProperties).then(publishToSession).catch(handleError);
      });
    }
  });
  Object.defineProperty(this, 'subscribe', {
    enumerable: true,
    writable: true,
    value: function value(stream) {
      var subscriberProperties = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var networkTest = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      var analytics = _this.analytics,
          state = _this.state,
          streamContainers = _this.streamContainers,
          session = _this.session,
          triggerEvent = _this.triggerEvent,
          callProperties = _this.callProperties,
          screenProperties = _this.screenProperties;

      return new Promise(function (resolve, reject) {
        var connectionData = void 0;
        analytics.log(logAction.subscribe, logVariation.attempt);
        var streamMap = state.getStreamMap();
        var streamId = stream.streamId;
        // No videoType indicates SIP https://tokbox.com/developer/guides/sip/

        var type = pathOr('sip', 'videoType', stream);
        if (streamMap[streamId] && !networkTest) {
          // Are we already subscribing to the stream?
          var _state$all = state.all(),
              subscribers = _state$all.subscribers;

          resolve(subscribers[type][streamMap[streamId]]);
        } else {
          try {
            connectionData = JSON.parse(path(['connection', 'data'], stream) || null);
          } catch (e) {
            connectionData = path(['connection', 'data'], stream);
          }
          var container = dom.element(streamContainers('subscriber', type, connectionData, stream));
          var options = Object.assign({}, type === 'camera' || type === 'custom' || type === 'sip' ? callProperties : screenProperties, subscriberProperties);
          var subscriber = session.subscribe(stream, container, options, function (error) {
            if (error) {
              analytics.log(logAction.subscribe, logVariation.fail);
              reject(error);
            } else {
              state.addSubscriber(subscriber);
              triggerEvent('subscribeTo' + properCase(type), Object.assign({}, { subscriber: subscriber }, state.all()));
              type === 'screen' && triggerEvent('startViewingSharedScreen', subscriber); // Legacy event
              analytics.log(logAction.subscribe, logVariation.success);
              resolve(subscriber);
            }
          });
        }
      });
    }
  });
  Object.defineProperty(this, 'unsubscribe', {
    enumerable: true,
    writable: true,
    value: function value(subscriber) {
      var analytics = _this.analytics,
          session = _this.session,
          state = _this.state;

      return new Promise(function (resolve) {
        analytics.log(logAction.unsubscribe, logVariation.attempt);
        var type = pathOr('sip', 'stream.videoType', subscriber);
        state.removeSubscriber(type, subscriber);
        session.unsubscribe(subscriber);
        analytics.log(logAction.unsubscribe, logVariation.success);
        resolve();
      });
    }
  });
  Object.defineProperty(this, 'setSession', {
    enumerable: true,
    writable: true,
    value: function value() {
      _this.session = _this.state.getSession();
    }
  });
  Object.defineProperty(this, 'onStreamCreated', {
    enumerable: true,
    writable: true,
    value: function value(_ref) {
      var stream = _ref.stream;
      return _this.active && _this.autoSubscribe && _this.subscribe(stream);
    }
  });
  Object.defineProperty(this, 'onStreamDestroyed', {
    enumerable: true,
    writable: true,
    value: function value(_ref2) {
      var stream = _ref2.stream;
      var state = _this.state,
          triggerEvent = _this.triggerEvent;

      state.removeStream(stream);
      var type = pathOr('sip', 'videoType', stream);
      type === 'screen' && triggerEvent('endViewingSharedScreen'); // Legacy event
      triggerEvent('unsubscribeFrom' + properCase(type), state.getPubSub());
    }
  });
  Object.defineProperty(this, 'createEventListeners', {
    enumerable: true,
    writable: true,
    value: function value() {
      var core = _this.core,
          onStreamCreated = _this.onStreamCreated,
          onStreamDestroyed = _this.onStreamDestroyed;

      core.on('streamCreated', onStreamCreated);
      core.on('streamDestroyed', onStreamDestroyed);
    }
  });
  Object.defineProperty(this, 'startCall', {
    enumerable: true,
    writable: true,
    value: function value(source, publisherProperties) {
      var analytics = _this.analytics,
          state = _this.state,
          subscribe = _this.subscribe,
          ableToJoin = _this.ableToJoin,
          triggerEvent = _this.triggerEvent,
          autoSubscribe = _this.autoSubscribe,
          publish = _this.publish;

      return new Promise(function (resolve, reject) {
        // eslint-disable-line consistent-return
        analytics.log(logAction.startCall, logVariation.attempt);

        _this.active = true;
        var initialStreamIds = Object.keys(state.getStreams());

        /**
         * Determine if we're able to join the session based on an existing connection limit
         */
        if (!ableToJoin()) {
          var errorMessage = 'Session has reached its connection limit';
          triggerEvent('error', errorMessage);
          analytics.log(logAction.startCall, logVariation.fail);
          return reject(new CoreError(errorMessage, 'connectionLimit'));
        }

        /**
         * Subscribe to any streams that existed before we start the call from our side.
         */
        var subscribeToInitialStreams = function subscribeToInitialStreams(publisher) {
          // Get an array of initial subscription promises
          var initialSubscriptions = function initialSubscriptions() {
            if (autoSubscribe) {
              var streams = state.getStreams();
              return initialStreamIds.map(function (id) {
                return subscribe(streams[id]);
              });
            }
            return [Promise.resolve()];
          };

          // Handle success
          var onSubscribeToAll = function onSubscribeToAll() {
            var pubSubData = Object.assign({}, state.getPubSub(), { publisher: publisher });
            triggerEvent('startCall', pubSubData);
            resolve(pubSubData);
          };

          // Handle error
          var onError = function onError(reason) {
            message('Failed to subscribe to all existing streams: ' + reason);
            // We do not reject here in case we still successfully publish to the session
            resolve(Object.assign({}, _this.state.getPubSub(), { publisher: publisher }));
          };

          Promise.all(initialSubscriptions()).then(onSubscribeToAll).catch(onError);
        };

        publish(source, publisherProperties).then(subscribeToInitialStreams).catch(reject);
      });
    }
  });
  Object.defineProperty(this, 'endCall', {
    enumerable: true,
    writable: true,
    value: function value() {
      var analytics = _this.analytics,
          state = _this.state,
          session = _this.session,
          unsubscribe = _this.unsubscribe,
          triggerEvent = _this.triggerEvent;

      analytics.log(logAction.endCall, logVariation.attempt);

      var _state$getPubSub = state.getPubSub(),
          publishers = _state$getPubSub.publishers,
          subscribers = _state$getPubSub.subscribers;

      var unpublish = function unpublish(publisher) {
        return session.unpublish(publisher);
      };
      Object.values(publishers.camera).forEach(unpublish);
      Object.values(publishers.screen).forEach(unpublish);
      // TODO Promise.all for unsubsribing
      Object.values(subscribers.camera).forEach(unsubscribe);
      Object.values(subscribers.screen).forEach(unsubscribe);
      state.removeAllPublishers();
      _this.active = false;
      triggerEvent('endCall');
      analytics.log(logAction.endCall, logVariation.success);
    }
  });
  Object.defineProperty(this, 'enableLocalAV', {
    enumerable: true,
    writable: true,
    value: function value(id, source, enable) {
      var streamSource = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'camera';

      var method = 'publish' + properCase(source);

      var _state$getPubSub2 = _this.state.getPubSub(),
          publishers = _state$getPubSub2.publishers;

      publishers[streamSource][id][method](enable);
    }
  });
  Object.defineProperty(this, 'enableRemoteAV', {
    enumerable: true,
    writable: true,
    value: function value(subscriberId, source, enable) {
      var method = 'subscribeTo' + properCase(source);

      var _state$getPubSub3 = _this.state.getPubSub(),
          subscribers = _state$getPubSub3.subscribers;

      var subscriber = subscribers.camera[subscriberId] || subscribers.sip[subscriberId];
      subscriber[method](enable);
    }
  });
  Object.defineProperty(this, 'getUserMedia', {
    enumerable: true,
    writable: true,
    value: function value(options) {
      return OT.getUserMedia(options);
    }
  });
  Object.defineProperty(this, 'updateCallProperties', {
    enumerable: true,
    writable: true,
    value: function value(properties) {
      _this.callProperties = Object.assign({}, _this.callProperties, properties);
    }
  });
};

exports.default = Communication;