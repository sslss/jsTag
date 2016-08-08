var jsTag = angular.module('jsTag');

// This service handles everything related to input (when to focus input, key pressing, breakcodeHit).
jsTag.factory('InputService', ['$filter', function ($filter) {

    // Constructor
    function InputService(options) {
        this.input = "";
        this.isWaitingForInput = options.autoFocus || false;
        this.options = options;
    }

    // *** Events *** //

    // Handles an input of a new tag keydown
    InputService.prototype.onKeydown = function (inputService, tagsCollection, options) {
        var e = options.$event;
        var $element = angular.element(e.currentTarget);
        var keycode = e.which;
        // In order to know how to handle a breakCode or a backspace, we must know if the typeahead
        // input value is empty or not. e.g. if user hits backspace and typeahead input is not empty
        // then we have nothing to do as user si not trying to remove a tag but simply tries to
        // delete some character in typeahead's input.
        // To know the value in the typeahead input, we can't use `this.input` because when
        // typeahead is in uneditable mode, the model (i.e. `this.input`) is not updated and is set
        // to undefined. So we have to fetch the value directly from the typeahead input element.
        //
        // We have to test this.input first, because $element.typeahead is a function and can be set
        // even if we are not in the typeahead mode.
        // So in this case, the value is always null and the preventDefault is never fired
        // This cause the form to always submit after hitting the Enter key.
        //var value = ($element.typeahead !== undefined) ? $element.typeahead('val') : this.input;
        var value = this.input || (($element.typeahead !== undefined) ? $element.typeahead('val') : undefined);
        var valueIsEmpty = (value === null || value === undefined || value === "");

        // Check if should break by breakcodes
        if ($filter("inArray")(keycode, this.options.breakCodes) !== false) {

            inputService.breakCodeHit(tagsCollection, this.options);

            // Trigger breakcodeHit event allowing extensions (used in twitter's typeahead directive)
            $element.triggerHandler('jsTag:breakcodeHit');

            // Do not trigger form submit if value is not empty.
            if (!valueIsEmpty) {
                e.preventDefault();
            }

        } else {
            switch (keycode) {
                case 9: // Tab

                    break;
                case 37: // Left arrow
                case 8: // Backspace
                    if (valueIsEmpty) {
                        // TODO: Call removing tag event instead of calling a method, easier to customize
                        tagsCollection.setLastTagActive();
                    }

                    break;
            }
        }
    };

    // Handles an input of an edited tag keydown
    InputService.prototype.tagInputKeydown = function (tagsCollection, options) {
        var e = options.$event;
        var keycode = e.which;

        if (keycode === 27 && typeof tagsCollection._editedTagOriginValue !== 'undefined') {
            tagsCollection.getEditedTag().value = tagsCollection._editedTagOriginValue;
            this.breakCodeHitOnEdit(tagsCollection, options);
        } else if ($filter('inArray')(keycode, this.options.breakCodes) !== false) { // Check if should break by breakcodes
            this.breakCodeHitOnEdit(tagsCollection, options);
        }
    };


    InputService.prototype.onBlur = function (tagsCollection) {
        this.breakCodeHit(tagsCollection, this.options);
    };

    // *** Methods *** //

    InputService.prototype.resetInput = function () {
        var value = this.input;
        this.input = "";
        return value;
    };

    // Sets focus on input
    InputService.prototype.focusInput = function () {
        this.isWaitingForInput = true;
    };

    // breakCodeHit is called when finished creating tag
    InputService.prototype.breakCodeHit = function (tagsCollection, options) {
        if (this.input !== '') {
            var originalValue = this.resetInput(), isValueValid = true;

            // Input is an object when using typeahead (the key is chosen by the user)
            if (originalValue instanceof Object) {
                originalValue = originalValue[options.tagDisplayKey || Object.keys(originalValue)[0]];
            }

            // Split value by spliter (usually ,)
            var values = originalValue.split(options.splitter), i, key, value;
            // Remove empty string objects from the values
            for (i = 0; i < values.length; i++) {
                if (!values[i]) {
                    values.splice(i--, 1);
                }
            }

            // Add tags to collection
            for (key in values) {
                if (!values.hasOwnProperty(key)) {
                    continue;
                }  // for IE 8
                value = values[key];

                if (tagsCollection._valueFormatter) {
                    value = tagsCollection._valueFormatter(value);
                }
                if (typeof tagsCollection._valueValidator === 'function') {
                    var isValid = tagsCollection._valueValidator(value);
                    if (isValid === null) {
                        isValueValid = false;
                        continue;
                    } else if (isValid === false) {
                        if (this.options.addOnInvalid) {
                            var tag = tagsCollection.addTag(value);
                            tag.valid = false;
                        }
                        continue;
                    }
                }
                tagsCollection.addTag(value);
            }

            if (!isValueValid) {
                this.input = originalValue;
            }
        }
    };

    // breakCodeHit is called when finished editing tag
    InputService.prototype.breakCodeHitOnEdit = function (tagsCollection, options) {
        // Input is an object when using typeahead (the key is chosen by the user)
        var editedTag = tagsCollection.getEditedTag(),
            value = angular.copy(editedTag.value);

        if (value instanceof Object) {
            value = value[options.tagDisplayKey || Object.keys(value)[0]];
        }

        if (tagsCollection._valueFormatter) {
            value = tagsCollection._valueFormatter(value);
        }
        editedTag.value = value;

        if (typeof tagsCollection._valueValidator === 'function') {
            var isValid = tagsCollection._valueValidator(editedTag.value);
            if (isValid === null) {
                return;
            } else if (isValid === false) {
                if (!this.options.addOnInvalid) {
                    return;
                }
                editedTag.valid = false;
            } else {
                editedTag.valid = true;
            }
        }

        angular.forEach(tagsCollection._onEditListenerList, function (callback) {
            callback(editedTag);
        });

        tagsCollection.unsetEditedTag();
        this.isWaitingForInput = true;
    };

    return InputService;
}]);
