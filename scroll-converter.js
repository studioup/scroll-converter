/*
scrollConverter 1.0.2
https://github.com/koggdal/scroll-converter

Copyright 2011–2017 Johannes Koggdal (http://koggdal.com/)
Developed for BombayWorks (http://bombayworks.com/)

Released under MIT license
*/

(function (root, factory) {
	if ( typeof define === 'function' && define.amd ) {
		define([], function () {
			return factory(root);
		});
	} else if ( typeof exports === 'object' ) {
		module.exports = factory(root);
	} else {
		root.ScrollConverter = factory(root);
	}
})(typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this, function (window) {
	'use strict';

	/**
	 * Local object for method references
	 * and define script meta-data
	 */
	
	var Constructor = function(options) {
		var defaults = {
			element: window,
		};

		var settings = Object.assign({}, defaults, options);

		// Private vars
		var $window = settings.element,
			$document = $window.document || $window,
			$documentElement = $document.documentElement || $document,
			$documentBody = $document.body || $document,
			active = false,
			hasDeactivated = false,
			eventsBound = false,
			ScrollConverter = {};

		var mouseWheelHandler;
		var scrollHandler;

		// Private methods
		var scrollCallback = function (offset, event, callback) {

				// Abort the scrolling if it's inactive
				if (!active) {
					return true;
				}

				var delta, numPixelsPerStep, change, newOffset,
					docOffset, scrollWidth, winWidth, maxOffset;

				// Set scrolling parameters
				delta = 0;
				numPixelsPerStep = 10;

				// Find the maximum offset for the scroll
				docOffset = ($documentElement ? $documentElement.offsetWidth : 0) || 0;
				scrollWidth = $documentBody.scrollWidth || 0;
				winWidth = $documentElement ? $documentElement.clientWidth : 0;
				maxOffset = Math.max(docOffset, scrollWidth) - winWidth;

				// Chrome and Safari seem to get interference when scrolling horizontally
				// with a trackpad, so if the scroll is horizontal we just ignore it here
				// and let the browser scroll like normal. These properties don't exist in
				// all browsers, but it also seems to work fine in other browsers, so this
				// is fine.

				/*
				if (Math.abs(event.wheelDeltaX) > Math.abs(event.wheelDeltaY)) {
					return true;
				}
				*/

				// "Normalize" the wheel value across browsers
				//  The delta value after this will not be the same for all browsers.
				//  Instead, it is normalized in a way to try to give a pretty similar feeling in all browsers.
				// 
				//  Firefox and Opera
				if (event.detail) {
					delta = event.detail * -240;
				}
				// IE, Safari and Chrome
				else if (event.wheelDelta) {
					delta = event.wheelDelta * 5;
				}

				// Get the real offset change from the delta
				//  A positive change is when the user scrolled the wheel up (in regular scrolling direction)
				//  A negative change is when the user scrolled the wheel down
				change = delta / 120 * numPixelsPerStep;
				newOffset = offset.x - change;

				// Do the scroll if the new offset is positive
				if (newOffset >= 0 && newOffset <= maxOffset) {
					offset.x = newOffset;
					offset.setByScript = true;
					$window.scrollTo(offset.x, offset.y);
				}
				// Keep the offset within the boundaries
				else if (offset.x !== 0 && offset.x !== maxOffset) {
					offset.x = newOffset > maxOffset ? maxOffset : 0;
					offset.setByScript = true;
					$window.scrollTo(offset.x, offset.y);
				}

				// Fire the callback
				if (typeof callback === "function") {
					callback(offset);
				}

				return false;
			},

			getOffset = function (axis) {
				axis = axis.toUpperCase();
				var pageOffset = "page" + axis + "Offset",
					scrollValue = "scroll" + axis,
					scrollDir = "scroll" + (axis === "X" ? "Left" : "Top");

				// Get the scroll offset for all browsers
				return $window[pageOffset] || $window[scrollValue] || (function () {
					var rootElem = $window || $document.documentElement || $documentBody.parentNode;
					return ((typeof rootElem[scrollDir] === "number") ? rootElem : $documentBody)[scrollDir];
				}());
			},

			bindEvents = function (offset, cb) {

				var callback = function (e) {

						// Fix event object for IE8 and below
						e = e || $window.event;

						// Trigger the scroll behavior
						var shouldPreventDefault = scrollCallback(offset, e, cb) === false;

						// Prevent the normal scroll action to happen
						if (shouldPreventDefault) {
							if (e.preventDefault && e.stopPropagation) {
								e.preventDefault();
								e.stopPropagation();
							} else {
								return false;
							}
						}
					},

					updateOffsetOnScroll = function () {

						// Update the offset variable when the normal scrollbar is used
						if (!offset.setByScript) {
							offset.x = getOffset("x");
							offset.y = getOffset("y");
						}
						offset.setByScript = false;
					};

				mouseWheelHandler = callback;
				scrollHandler = updateOffsetOnScroll;

				// Safari, Chrome, Opera, IE9+
				if ($window.addEventListener) {

					// Safari, Chrome, Opera, IE9
					if ("onmousewheel" in window) {
						$window.addEventListener("mousewheel", mouseWheelHandler, false);
						$window.addEventListener("scroll", scrollHandler, false);
					}
					// Firefox
					else {
						$window.addEventListener("DOMMouseScroll", mouseWheelHandler, false);
						$window.addEventListener("scroll", scrollHandler, false);
					}
				}
				// IE8 and below
				else {
					$document.attachEvent("onmousewheel", mouseWheelHandler);
					$window.attachEvent("onscroll", scrollHandler);
				}
			},

			unbindEvents = function () {
				if (!mouseWheelHandler && !scrollHandler) return;

				// Safari, Chrome, Opera, IE9+
				if ($window.removeEventListener) {

					// Safari, Chrome, Opera, IE9
					if ("onmousewheel" in window) {
						$window.removeEventListener("mousewheel", mouseWheelHandler, false);
						$window.removeEventListener("scroll", scrollHandler, false);
					}
					// Firefox
					else {
						$window.removeEventListener("DOMMouseScroll", mouseWheelHandler, false);
						$window.removeEventListener("scroll", scrollHandler, false);
					}
				}
				// IE8 and below
				else {
					$document.detachEvent("onmousewheel", mouseWheelHandler);
					$window.detachEvent("onscroll", scrollHandler);
				}
			},

			deactivateScrolling = function (e) {
				e.preventDefault();
				e.stopPropagation();
				return false;
			};

		// Activate the scrolling switch
		//  An optional callback can be passed in, which will fire at every scroll update
		ScrollConverter.activate = function (callback) {
			// Set state
			active = true;

			// Bind events if it hasn't been done before
			if (!eventsBound) {
				var offset = { x: 0, y: 0 };
				bindEvents(offset, callback);
				eventsBound = true;
			}

			// Remove event handlers if it was previously deactivated
			if (hasDeactivated) {
				if ($window.addEventListener) {
					$window.removeEventListener("scroll", deactivateScrolling, true);
				} else {
					$window.detachEvent("onscroll", deactivateScrolling);
				}
				hasDeactivated = false;
			}
		};

		ScrollConverter.deactivate = function () {
			active = false;

			if (eventsBound) {
				unbindEvents();
				eventsBound = false;
			}
		};

		ScrollConverter.deactivateAllScrolling = function () {

			// Set state
			active = false;
			hasDeactivated = true;

			// Bind event handlers to disable the scroll
			if ($window.addEventListener) {
				$window.addEventListener("scroll", deactivateScrolling, true);
			} else {
				$window.attachEvent("onscroll", deactivateScrolling);
			}
		}

		ScrollConverter.enabled = function(bool) {
			if(bool) {
				ScrollConverter.activate();
			}else {
				ScrollConverter.deactivate();
			}
		}

		return ScrollConverter;
	}

	return Constructor;
});
