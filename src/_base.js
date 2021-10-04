import {mobileCheck, q, color2Hex, clearThree} from './helpers.js'
// const DEBUGMODE = window.location.toString().indexOf('KASHINDEBUG') !== -1
import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';

const win = typeof window == 'object'
//let THREE = (win && window.THREE) || {}
if (win && !window.KASHIN) window.KASHIN = {}
const KASHIN = (win && window.KASHIN) || {}
KASHIN.register = (name, Effect) => {
  return KASHIN[name] = (opts) => new Effect(opts)
}

export {KASHIN}

// const ORBITCONTROLS = {
//   enableZoom: false,
//   userPanSpeed: 3,
//   userRotateSpeed: 2.0,
//   maxPolarAngle: Math.PI * 0.8, // (pi/2 is pure horizontal)
//   mouseButtons: {
//     ORBIT: THREE.MOUSE.LEFT,
//     ZOOM: null,
//     PAN: null
//   }
// }
// if (DEBUGMODE) {
//   Object.assign(ORBITCONTROLS, {
//     enableZoom: true,
//     zoomSpeed: 4,
//     minDistance: 100,
//     maxDistance: 4500
//   })
// }

// Namespace for errors
const error = function () {
  Array.prototype.unshift.call(arguments, '[KASHIN]')
  return console.error.apply(this, arguments)
}

KASHIN.Base = class Base {
  constructor(userOptions = {}) {
    if (!win) return false
    KASHIN.current = this
    this.clicking = false
    this.windowMouseMoveWrapper = this.windowMouseMoveWrapper.bind(this)
    this.windowMousePressedWrapper = this.windowMousePressedWrapper.bind(this)
    this.windowMouseUnpressedWrapper = this.windowMouseUnpressedWrapper.bind(this)
    this.windowMousePressedMoveWrapper = this.windowMousePressedMoveWrapper.bind(this)
    this.windowTouchWrapper = this.windowTouchWrapper.bind(this)
    this.windowGyroWrapper = this.windowGyroWrapper.bind(this)
    this.resize = this.resize.bind(this)
    this.animationLoop = this.animationLoop.bind(this)
    this.restart = this.restart.bind(this)
    this.THREE = THREE
    this.clock = new this.THREE.Clock()
    this.delta = 0
    this.interval = 1 / 40


    const defaultOptions = (typeof this.getDefaultOptions === 'function') ? this.getDefaultOptions() : this.defaultOptions
    this.options = Object.assign({
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 600,
      minWidth: 200,
      scale: 1,
      scaleMobile: 1,
    }, defaultOptions)

    if (userOptions instanceof HTMLElement || typeof userOptions === 'string') {
      userOptions = {el: userOptions}
    }
    Object.assign(this.options, userOptions)

    // Set element
    this.el = this.options.el
    if (this.el == null) {
      error("Instance needs \"el\" param!")
    } else if (!(this.options.el instanceof HTMLElement)) {
      const selector = this.el
      this.el = q(selector)
      if (!this.el) {
        error("Cannot find element", selector)
        return
      }
    }

    this.prepareEl()
    this.setSize() // Init needs size
    this.initThree()

    try {
      this.init()
    } catch (e) {
      // FALLBACK - just use color
      error('Init error', e)
      if (this.renderer && this.renderer.domElement) {
        this.el.removeChild(this.renderer.domElement)
      }
      if (this.options.backgroundColor) {
        console.log('[KASHIN] Falling back to backgroundColor')
        this.el.style.background = color2Hex(this.options.backgroundColor)
      }
      return
    }

    // After init
    this.initMouse() // Triggers mouse, which needs to be called after init
    this.resize()
    this.animationLoop()

    // Event listeners
    const ad = window.addEventListener
    ad('resize', this.resize)
    window.requestAnimationFrame(this.resize) // Force a resize after the first frame

    // Add event listeners on window, because this element may be below other elements, which would block the element's own mousemove event
    if (this.options.mouseControls) {
      ad('scroll', this.windowMouseMoveWrapper)
      ad('mousedown', this.windowMousePressedWrapper)
      ad('mouseup', this.windowMouseUnpressedWrapper)
      ad('mousemove', this.windowMousePressedMoveWrapper)
    }
    if (this.options.touchControls) {
      ad('touchstart', this.windowTouchWrapper)
      ad('touchmove', this.windowTouchWrapper)
    }
    if (this.options.gyroControls) {
      ad('deviceorientation', this.windowGyroWrapper)
    }
  }

  setOptions(userOptions = {}) {
    Object.assign(this.options, userOptions)
    this.triggerMouseMove()
  }

  prepareEl() {
    let i, child
    // wrapInner for text nodes, so text nodes can be put into foreground
    if (typeof Node !== 'undefined' && Node.TEXT_NODE) {
      for (i = 0; i < this.el.childNodes.length; i++) {
        const n = this.el.childNodes[i]
        if (n.nodeType === Node.TEXT_NODE) {
          const s = document.createElement('span')
          s.textContent = n.textContent
          n.parentElement.insertBefore(s, n)
          n.remove()
        }
      }
    }
    // Set foreground elements
    for (i = 0; i < this.el.children.length; i++) {
      child = this.el.children[i]
      if (getComputedStyle(child).position === 'static') {
        child.style.position = 'relative'
      }
      if (getComputedStyle(child).zIndex === 'auto') {
        child.style.zIndex = 1
      }
    }
    // Set canvas and container style
    if (getComputedStyle(this.el).position === 'static') {
      this.el.style.position = 'relative'
    }
  }

  applyCanvasStyles(canvasEl, opts = {}) {
    Object.assign(canvasEl.style, {
      position: 'absolute',
      zIndex: 0,
      top: 0,
      left: 0,
      background: ''
    })
    Object.assign(canvasEl.style, opts)
    canvasEl.classList.add('vanta-canvas')
  }

  initThree() {
    if (!this.THREE.WebGLRenderer) {
      console.warn("[KASHIN] No THREE defined on window")
      return
    }
    // Set renderer
    this.renderer = new this.THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    })

    this.composer = new EffectComposer(this.renderer)
    this.composer.setSize(this.width, this.height)
    this.el.appendChild(this.renderer.domElement)
    this.applyCanvasStyles(this.renderer.domElement)
    if (isNaN(this.options.backgroundAlpha)) {
      this.options.backgroundAlpha = 1
    }

    this.scene = new this.THREE.Scene()
  }

  getCanvasElement() {
    if (this.renderer) {
      return this.renderer.domElement // three.js
    }
    if (this.p5renderer) {
      return this.p5renderer.canvas // p5
    }
  }

  getCanvasRect() {
    const canvas = this.getCanvasElement()
    if (!canvas) return false
    return canvas.getBoundingClientRect()
  }

  windowMousePressedWrapper(e) {
    this.triggerMousePress()
  }

  windowMouseUnpressedWrapper(e) {
    this.triggerMouseUnpress()
  }

  windowMousePressedMoveWrapper(e) {
    if (!this.clicking) return false
    const rect = this.getCanvasRect()
    if (!rect) return false
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
      this.mouseX = x
      this.mouseY = y
      if (!this.options.mouseEase) this.triggerMouseMove(x, y)
    }
  }

  windowMouseMoveWrapper(e) {
    const rect = this.getCanvasRect()
    if (!rect) return false
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
      this.mouseX = x
      this.mouseY = y
      if (!this.options.mouseEase) this.triggerMouseMove(x, y)
    }
  }
  windowTouchWrapper(e) {
    const rect = this.getCanvasRect()
    if (!rect) return false
    if (e.touches.length === 1) {
      const x = e.touches[0].clientX - rect.left
      const y = e.touches[0].clientY - rect.top
      if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
        this.mouseX = x
        this.mouseY = y
        if (!this.options.mouseEase) this.triggerMouseMove(x, y)
      }
    }
  }
  windowGyroWrapper(e) {
    const rect = this.getCanvasRect()
    if (!rect) return false
    const x = Math.round(e.alpha * 2) - rect.left
    const y = Math.round(e.beta * 2) - rect.top
    if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
      this.mouseX = x
      this.mouseY = y
      if (!this.options.mouseEase) this.triggerMouseMove(x, y)
    }
  }

  triggerMouseMove(x, y) {
    if (x === undefined && y === undefined) { // trigger at current position
      if (this.options.mouseEase) {
        x = this.mouseEaseX
        y = this.mouseEaseY
      } else {
        x = this.mouseX
        y = this.mouseY
      }
    }
    if (this.uniforms) {
      this.uniforms.iMouse.value.x = x / this.scale // pixel values
      this.uniforms.iMouse.value.y = y / this.scale // pixel values
    }
    const xNorm = x / this.width // 0 to 1
    const yNorm = y / this.height // 0 to 1
    typeof this.onMouseMove === "function" ? this.onMouseMove(xNorm, yNorm) : void 0
  }
  triggerMousePress() {
    this.clicking = true
  }

  triggerMouseUnpress() {
    this.clicking = false
  }

  setSize() {
    this.scale || (this.scale = 1)
    if (mobileCheck() && this.options.scaleMobile) {
      this.scale = this.options.scaleMobile
    } else if (this.options.scale) {
      this.scale = this.options.scale
    }
    this.width = Math.max(this.el.offsetWidth, this.options.minWidth)
    this.height = Math.max(this.el.offsetHeight, this.options.minHeight)
  }
  initMouse() {
    // Init mouseX and mouseY
    if ((!this.mouseX && !this.mouseY) ||
      (this.mouseX === this.options.minWidth / 2 && this.mouseY === this.options.minHeight / 2)) {
      this.mouseX = this.width / 2
      this.mouseY = this.height / 2
      this.triggerMouseMove(this.mouseX, this.mouseY)
    }
  }

  resize() {
    this.setSize()
    if (this.camera) {
      this.camera.aspect = this.width / this.height
      if (typeof this.camera.updateProjectionMatrix === "function") {
        this.camera.updateProjectionMatrix()
      }
    }
    if (this.renderer) {
      this.renderer.setSize(this.width, this.height)
      this.renderer.setPixelRatio(window.devicePixelRatio / this.scale)
    }
    typeof this.onResize === "function" ? this.onResize() : void 0
  }

  isOnScreen() {
    const elHeight = this.el.offsetHeight
    const elRect = this.el.getBoundingClientRect()
    const scrollTop = (window.pageYOffset ||
      (document.documentElement || document.body.parentNode || document.body).scrollTop
    )
    const offsetTop = elRect.top + scrollTop
    const minScrollTop = offsetTop - window.innerHeight
    const maxScrollTop = offsetTop + elHeight
    return minScrollTop <= scrollTop && scrollTop <= maxScrollTop
  }

  animationLoop() {
    // Step time
    this.t || (this.t = 0)
    this.t += 1
    // Uniform time
    this.t2 || (this.t2 = 0)
    this.t2 += (this.options.speed || 1)
    if (this.uniforms) {
      this.uniforms.iTime.value = this.t2 * 0.016667 // iTime is in seconds
    }

    if (this.options.mouseEase) {
      this.mouseEaseX = this.mouseEaseX || this.mouseX || 0
      this.mouseEaseY = this.mouseEaseY || this.mouseY || 0
      if (Math.abs(this.mouseEaseX - this.mouseX) + Math.abs(this.mouseEaseY - this.mouseY) > 0.1) {
        this.mouseEaseX += (this.mouseX - this.mouseEaseX) * 0.05
        this.mouseEaseY += (this.mouseY - this.mouseEaseY) * 0.05
        this.triggerMouseMove(this.mouseEaseX, this.mouseEaseY)
      }
    }

    // Only animate if element is within view
    if (this.isOnScreen() || this.options.forceAnimate) {
      if (typeof this.onUpdate === "function") {
        this.onUpdate()
      }
      if (this.scene && this.camera) {

        this.delta += this.clock.getDelta()
        if (this.delta > this.interval) {
          this.renderer.render(this.scene, this.camera)
          this.renderer.setClearColor(this.options.backgroundColor, this.options.backgroundAlpha)
          this.composer.render()
          this.delta = this.delta % this.interval;
        }
      }
      // if (this.stats) this.stats.update()
      // if (this.renderStats) this.renderStats.update(this.renderer)
      if (this.fps && this.fps.update) this.fps.update()
      if (typeof this.afterRender === "function") this.afterRender()
    }

    window.requestAnimationFrame(this.animationLoop)
  }

  // setupControls() {
  //   if (DEBUGMODE && THREE.OrbitControls) {
  //     this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement)
  //     Object.assign(this.controls, ORBITCONTROLS)
  //     return this.scene.add(new THREE.AxisHelper(100))
  //   }
  // }

  restart() {
    // Restart the effect without destroying the renderer
    if (this.scene) {
      while (this.scene.children.length) {
        this.scene.remove(this.scene.children[0])
      }
    }
    if (typeof this.onRestart === "function") {
      this.onRestart()
    }
    this.init()
  }

  init() {
    if (typeof this.onInit === "function") {
      this.onInit()
    }
    // this.setupControls()
  }

  destroy() {
    if (typeof this.onDestroy === "function") {
      this.onDestroy()
    }
    const rm = window.removeEventListener
    rm('touchstart', this.windowTouchWrapper)
    rm('touchmove', this.windowTouchWrapper)
    rm('scroll', this.windowMouseMoveWrapper)
    rm('mousemove', this.windowMouseMoveWrapper)
    rm('mouseup', this.windowMousePressedMoveWrapper)
    rm('mousedown', this.windowMouseUnpressedWrapper)
    rm('deviceorientation', this.windowGyroWrapper)
    rm('resize', this.resize)
    window.cancelAnimationFrame(this.req)

    const scene = this.scene
    if (scene && scene.children) {
      clearThree(scene)
    }
    if (this.renderer) {
      if (this.renderer.domElement) {
        this.el.removeChild(this.renderer.domElement)
      }
      this.renderer = null
      this.composer = null
      this.scene = null
    }

    if (KASHIN.current === this) {
      KASHIN.current = null
    }
  }
}

export default KASHIN.Base
