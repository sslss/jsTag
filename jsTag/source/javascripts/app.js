var jsTag = angular.module('jsTag', []);

// Defaults for jsTag (can be overriden as shown in example)
jsTag.constant('jsTagDefaults', {
  'edit': true,
  'defaultTags': [],
  'breakCodes': [
    13, // Return
    44 // Comma
  ],
  'splitter': ',',
  'addOnInvalid': false,
  'texts': {
    'inputPlaceHolder': "Input text",
    'removeSymbol': String.fromCharCode(215)
  }
});