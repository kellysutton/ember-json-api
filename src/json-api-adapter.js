var get = Ember.get;

/**
 * Keep a record of routes to resources by type.
 */

// null prototype in es5 browsers wont allow collisions with things on the
// global Object.prototype.
DS._routes = Ember.create(null);

DS.JsonApiAdapter = DS.RESTAdapter.extend({
  defaultSerializer: 'DS/jsonApi',
  /**
   * Fix query URL.
   */
  findMany: function(store, type, ids, owner) {
    return this.ajax(this.buildURL(type.typeKey, ids.join(',')), 'GET');
  },

  /**
   * Cast individual record to array,
   * and match the root key to the route
   */
  createRecord: function(store, type, record) {
    var data = {};

    data[this.pathForType(type.typeKey)] = store.serializerFor(type.typeKey).serialize(record, {
      includeId: true
    });

    return this.ajax(this.buildURL(type.typeKey), 'POST', {
      data: data
    });
  },

  /**
   * Cast individual record to array,
   * and match the root key to the route
   */
  updateRecord: function(store, type, record) {
    var data = {};
    data[this.pathForType(type.typeKey)] = get(record, '_inFlightAttributes');

    var id = get(record, 'id');
    data[this.pathForType(type.typeKey)].id = id;

    return this.ajax(this.buildURL(type.typeKey, id), 'PUT', {
      data: data
    });
  },

  _tryParseErrorResponse:  function(responseText) {
    try {
      return Ember.$.parseJSON(responseText);
    } catch(e) {
      return "Something went wrong";
    }
  },

  ajaxError: function(jqXHR) {
    var error = this._super(jqXHR);
    var response;

    if (jqXHR && typeof jqXHR === 'object') {
      response = this._tryParseErrorResponse(jqXHR.responseText);
      var errors = {};

      if (response &&
          typeof response === 'object' &&
            response.errors !== undefined) {

        Ember.A(Ember.keys(response.errors)).forEach(function(key) {
          errors[Ember.String.camelize(key)] = response.errors[key];
        });
      }

      if (jqXHR.status === 422) {
        return new DS.InvalidError(errors);
      } else{
        return new ServerError(jqXHR.status, response, jqXHR);
      }
    } else {
      return error;
    }
  },
  /**
    Underscores the JSON root keys when serializing.

    @method serializeIntoHash
    @param {Object} hash
    @param {subclass of DS.Model} type
    @param {DS.Model} record
    @param {Object} options
    */
  serializeIntoHash: function(data, type, record, options) {
    var root = underscore(decamelize(type.typeKey));
    data[root] = this.serialize(record, options);
  },

  pathForType: function(type) {
    var decamelized = Ember.String.decamelize(type);
    return Ember.String.pluralize(decamelized);
  }
});

function ServerError(status, message, xhr) {
  this.status = status;
  this.message = message;
  this.xhr = xhr;

  this.stack = new Error().stack;
}

ServerError.prototype = Ember.create(Error.prototype);
ServerError.constructor = ServerError;

DS.JsonApiAdapter.ServerError = ServerError;

export default DS.JsonApiAdapter;
