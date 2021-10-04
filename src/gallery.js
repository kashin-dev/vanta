import {mobileCheck, getBrightness} from './helpers.js'

var effectName = null
var effect = null

const GALLERY = [
  "birds",
  "fog",
  "waves",
  "clouds",
  "clouds2",
  "globe",
  "net",
  "cells",
  // "ripple",
  "trunk",
  "topology",
  "dots",
  "rings",
  "halo",
]

var debounce = function (func, wait, immediate) {
  var timeout
  timeout = void 0
  return function () {
    var args, callNow, context, later
    context = this
    args = arguments
    later = function () {
      timeout = null
      if (!immediate) {func.apply(context, args)}
    }
    callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) {func.apply(context, args)}
  }
}

jQuery.extend(jQuery.easing, {
  easeInOutQuart: function (x, t, b, c, d) {
    if ((t /= d / 2) < 1) {
      return c / 2 * t * t * t * t + b
    }
    return -c / 2 * ((t -= 2) * t * t * t - 2) + b
  },
  easeInOutQuint: function (x, t, b, c, d) {
    if ((t /= d / 2) < 1) {
      return c / 2 * t * t * t * t * t + b
    }
    return c / 2 * ((t -= 2) * t * t * t * t + 2) + b
  }
})

var loadEffect = function (_effectName, loadOptions) {
  _effectName = _effectName.toUpperCase()
  // Instantiate
  loadOptions || (loadOptions = {})
  loadOptions.el = 'section'
  loadOptions.backgroundAlpha = 1

  console.log('[VANTA] Loading effect: ', _effectName)
  if (typeof VANTA == "undefined" || typeof VANTA[_effectName] !== "function") {
    console.error("[VANTA] Effect " + _effectName + ' not found!')
    return false
  }

  // Cleanup & reset preview dom
  if (typeof effect !== "undefined" && effect !== null) {
    effect.destroy()
  }

  // Init
  window.effect = effect = VANTA[_effectName](loadOptions)
  console.log(loadOptions)
  effect.name = effectName = _effectName

  var inner = $('.wm .inner')
  inner.find('.restart').hide()
  $('.wm').removeClass('dark-text')
  $('.dg').remove()
  // Set options

  var options = effect.options
  effect.fps = fps
  // Initialize controller
}

var updateBackgroundColor = function (color) {
  if (getBrightness(new THREE.Color(color)) > 0.65) {
    return $('.wm').addClass('dark-text')
  } else {
    return $('.wm').removeClass('dark-text')
  }
}

var updateHash = function () {
  var optionsToStore
  optionsToStore = $.extend({}, effect.options)
  delete optionsToStore.el
  return history.replaceState(void 0, void 0, "#" + rison.encode(optionsToStore))
}

var updateHashDebounced = debounce(updateHash, 750)

var openCloseUsage = function () {
  return $('.usage-cont').slideToggle({
    duration: 300,
    easing: 'easeInOutQuart'
  })
}

var loadEffectFromUrl = function () {
  var _effectName, e, loadOptions, u
  u = new URLSearchParams(document.location.search)
  _effectName = u.get('effect') || 'birds'
  loadOptions = null
  if (window.location.hash.length) {
    try {
      loadOptions = rison.decode(window.location.hash.substr(1))
    } catch (error) {
      e = error
      console.log('[VANTA] Invalid hash: ' + e)
    }
  }
  return loadEffect(_effectName, loadOptions)
}

class FPS {
  constructor() {
    var fpsOut
    this.filterStrength = 20
    this.frameTime = 0
    this.lastLoop = new Date
    this.fps = 0
    fpsOut = document.getElementById('fps')
    setInterval(() => {
      this.fps = 1000 / this.frameTime
      return fpsOut != null ? fpsOut.innerHTML = this.fps.toFixed(1) + " fps" : void 0
    }, 250)
  }

  update() {
    var thisFrameTime, thisLoop
    thisFrameTime = (thisLoop = new Date) - this.lastLoop
    this.frameTime += (thisFrameTime - this.frameTime) / this.filterStrength
    this.lastLoop = thisLoop
  }
}

document.addEventListener("DOMContentLoaded", function (event) {
  var _effectName, i, len
  fps = new FPS()
  loadEffectFromUrl()
  // Render gallery
  GALLERY.forEach(_effectName => {
    var itemTemplate, newItem
    itemTemplate = $('.item').first().hide()
    newItem = itemTemplate.clone().show().appendTo(itemTemplate.parent())
    newItem.find('.label').text(_effectName)
    newItem.addClass(_effectName).css({
      backgroundImage: `url(gallery/${_effectName}.jpg)`
    })
    newItem.click(function () {
      var url
      $('.item').removeClass('selected')
      $(this).addClass('selected')
      url = "?effect=" + _effectName
      window.history.pushState({
        effect: _effectName
      }, "", url)
      loadEffect(_effectName)
    })
  })

  // Mobile optimization
  if ($(window).width() > 727) {
    setTimeout(openCloseUsage, 600)
  }
  // Back button
  window.onpopstate = function (event) {
    loadEffectFromUrl()
  }
})
