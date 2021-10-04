import Base, {KASHIN} from './_base.js'
import {rn, ri, mobileCheck, getBrightness} from './helpers.js'
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js'
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

const win = typeof window == 'object'

class Effect extends Base {
  static initClass() {
    this.prototype.defaultOptions = {
      color: 0x4b7bec,
      backgroundColor: 0x000000,
      points: 20,
      maxDistance: 12,
      spacing: 10,
      showDots: true
    }
  }

  constructor(userOptions) {
    super(userOptions)
  }

  // onInit() {
  //   this.geometry = new this.THREE.BoxGeometry( 10, 10, 10 );
  //   this.material = new this.THREE.MeshLambertMaterial({
  //     color: this.options.color,
  //     emissive: this.options.color,
  //     emissiveIntensity: 0.75
  //   });
  //   this.cube = new this.THREE.Mesh( this.geometry, this.material );
  //   this.scene.add(this.cube);

  //   const c = this.camera = new this.THREE.PerspectiveCamera( 75, this.width/this.height, 0.1, 1000 );
  //   c.position.z = 30;
  //   c.lookAt(0,0,0);
  //   this.scene.add(c);

  //   const light = new this.THREE.HemisphereLight( 0xffffff, this.options.backgroundColor , 1 );
  //   this.scene.add(light);
  // }

  // onUpdate() {
  //   this.cube.rotation.x += 0.01;
  //   this.cube.rotation.y += 0.01;
  // }

  genPoint(x, y, z) {
    let sphere
    if (!this.points) {this.points = []}
    if (this.options.showDots) {
      const geometry = new this.THREE.SphereGeometry(this.options.dotSize || 0.35, 12, 12) // radius, width, height
      const material = new this.THREE.MeshLambertMaterial({
        color: this.options.color
      })
      sphere = new this.THREE.Mesh(geometry, material)
    } else {
      sphere = new this.THREE.Object3D()
    }
    this.cont.add(sphere)
    sphere.ox = x
    sphere.oy = y
    sphere.oz = z
    sphere.position.set(x, y, z)
    sphere.r = rn(-3, 3) // rotation rate
    return this.points.push(sphere)
  }

  onInit() {
    this.cont = new this.THREE.Group()
    this.cont.position.set(0, 0, 0)
    this.scene.add(this.cont)

    let n = this.options.points
    let {spacing} = this.options
    if (mobileCheck()) {
      n = ~~(n * 0.75)
      spacing = ~~(spacing * 0.65)
    }

    const numPoints = n * n * 2
    this.linePositions = new Float32Array(numPoints * numPoints * 3)
    this.lineColors = new Float32Array(numPoints * numPoints * 3)

    const colorB = getBrightness(new this.THREE.Color(this.options.color))
    const bgB = getBrightness(new this.THREE.Color(this.options.backgroundColor))
    this.blending = colorB > bgB ? 'additive' : 'subtractive'

    const geometry = new this.THREE.BufferGeometry()
    geometry.setAttribute('position', new this.THREE.BufferAttribute(this.linePositions, 3).setUsage(this.THREE.DynamicDrawUsage))
    geometry.setAttribute('color', new this.THREE.BufferAttribute(this.lineColors, 3).setUsage(this.THREE.DynamicDrawUsage))
    geometry.computeBoundingSphere()
    geometry.setDrawRange(0, 0)
    const material = new this.THREE.LineDashedMaterial({
      vertexColors: this.THREE.VertexColors,
      blending: this.blending === 'additive' ? this.THREE.AdditiveBlending : null,
      // blending: THREE.SubtractiveBlending
    })
    // blending: THREE.CustomBlending
    // blendEquation: THREE.SubtractEquation
    // blendSrc: THREE.SrcAlphaFactor
    // blendDst: THREE.OneMinusSrcAlphaFactor

    this.linesMesh = new this.THREE.LineSegments(geometry, material)
    this.cont.add(this.linesMesh)

    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n; j++) {
        const y = ri(-3, 3)
        const x = ((i - (n / 2)) * spacing) + ri(-5, 5)
        let z = ((j - (n / 2)) * spacing) + ri(-5, 5)
        if (i % 2) {z += spacing * 0.5} // offset

        // nexusX = Math.round(x / 20) * 20
        // nexusZ = Math.round(z / 20) * 20
        // x += (nexusX - x) * 0.01
        // z += (nexusZ - z) * 0.01
        this.genPoint(x, y - ri(2, 30), z)
        this.genPoint(x + ri(-5, 5), y + ri(2, 30), z + ri(-5, 5))
      }
    }


    //  # radius
    //   width, # width
    //   rn(0,1000), # startAng
    //   rn(1,6), # ang
    //   rn(0, 50/(radius+1) + 5) + 5/width/(radius+0.5), # y
    //   Math.max(-rn(0.5,2), rn(1, 50-radius/2) - radius/2) * 0.25 # speed
    // )

    // PerspectiveCamera( fov, aspect, near, far )
    this.camera = new this.THREE.PerspectiveCamera(
      25,
      this.width / this.height,
      0.01, 10000)
    this.camera.position.set(50, 0, 150)
    this.scene.add(this.camera)
    // ambience = new this.THREE.AmbientLight(0xffffff, 0.01)
    // @scene.add(ambience)

    // @pointLight = new this.THREE.PointLight(0xFFFFFF, 0.01)
    // @pointLight.position.set(0, 150, 200)
    // @scene.add( @pointLight )

    const ambience = new this.THREE.AmbientLight(0xffffff, 0.75)
    this.scene.add(ambience)

    this.spot = new this.THREE.SpotLight(0xFFFFFF, 1)
    this.spot.position.set(0, 200, 0)
    this.spot.distance = 400
    this.spot.target = this.cont

    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    const bloomPass = new UnrealBloomPass(new this.THREE.Vector2(this.width, this.height), 1.5, 0.4, 0.85)
    bloomPass.exposure = this.options.exposure || 1
    bloomPass.threshold = this.options.threshold || 0
    bloomPass.strength = this.options.strength || 3
    bloomPass.radius = this.options.radius || 0.5
    this.composer.addPass(bloomPass)

    return this.scene.add(this.spot)
  }

  onDestroy() {
    if (this.scene) this.scene.remove(this.linesMesh)
    this.spot = this.points = this.linesMesh = this.lineColors = this.linePositions = null
  }

  setOptions(userOptions) { // allow setOptions to change point colors
    super.setOptions(userOptions)
    if (userOptions.color) {
      this.points.forEach(p => {
        p.material.color = new this.THREE.Color(userOptions.color)
      })
    }
  }

  onUpdate() {
    let diff, t
    const c = this.camera
    if (Math.abs(c.tx - c.position.x) > 0.01) {
      diff = c.tx - c.position.x
      c.position.x += diff * 0.02
    }
    if (Math.abs(c.ty - c.position.y) > 0.01) {
      diff = c.ty - c.position.y
      c.position.y += diff * 0.02
    }
    c.lookAt(new this.THREE.Vector3(0, 0, 0))
    // c.near = 0.01
    // c.updateProjectionMatrix()

    let vertexpos = 0
    let colorpos = 0
    let numConnected = 0

    const bgColor = new this.THREE.Color(this.options.backgroundColor)
    const color = new this.THREE.Color(this.options.color)
    const diffColor = color.clone().sub(bgColor)

    if (this.rayCaster) {
      this.rayCaster.setFromCamera(new this.THREE.Vector2(this.rcMouseX, this.rcMouseY), this.camera);
    }

    // # TEMPORARY RAY DRAWING
    // pointA = @camera.position
    // direction = @rayCaster.ray.direction
    // direction.normalize()
    // distance = 1000000 # at what distance to determine pointB
    // pointB = new this.THREE.Vector3()
    // pointB.addVectors( pointA, direction.multiplyScalar( distance ) )
    // geometry = new this.THREE.Geometry()
    // geometry.vertices.push( pointA )
    // geometry.vertices.push( pointB )
    // material = new this.THREE.LineBasicMaterial( { color : 0xffffff } )
    // line = new this.THREE.Line( geometry, material )
    // @scene.add( line )

    for (let i = 0; i < this.points.length; i++) {
      let dist, distToMouse
      const p = this.points[i]
      // p.position.y += Math.sin(@t * 0.005 - 0.02 * p.ox + 0.015 * p.oz) * 0.02

      if (this.rayCaster) {
        distToMouse = this.rayCaster.ray.distanceToPoint(p.position)
      } else {
        distToMouse = 1000
      }
      const distClamp = distToMouse.clamp(5, 15)
      p.scale.x = (p.scale.y = (p.scale.z = ((15 - distClamp) * 0.25).clamp(1, 100)))

      if (p.r !== 0) {
        let ang = Math.atan2(p.position.z, p.position.x)
        dist = Math.sqrt((p.position.z * p.position.z) + (p.position.x * p.position.x))
        ang += 0.00025 * p.r
        p.position.x = dist * Math.cos(ang)
        p.position.z = dist * Math.sin(ang)
      }
      // p.position.x += Math.sin(@t * 0.01 + p.position.y) * 0.02
      // p.position.z += Math.sin(@t * 0.01 - p.position.y) * 0.02

      for (let j = i; j < this.points.length; j++) {
        const p2 = this.points[j]
        const dx = p.position.x - p2.position.x
        const dy = p.position.y - p2.position.y
        const dz = p.position.z - p2.position.z
        dist = Math.sqrt((dx * dx) + (dy * dy) + (dz * dz))
        if (dist < this.options.maxDistance) {
          let lineColor
          const alpha = ((1.0 - (dist / this.options.maxDistance)) * 2.5).clamp(0, 1)
          if (this.blending === 'additive') {
            lineColor = new this.THREE.Color(0x000000).lerp(diffColor, alpha)
          } else {
            lineColor = bgColor.clone().lerp(color, alpha)
          }
          // if @blending == 'subtractive'
          //   lineColor = new this.THREE.Color(0x000000).lerp(diffColor, alpha)

          this.linePositions[vertexpos++] = p.position.x
          this.linePositions[vertexpos++] = p.position.y
          this.linePositions[vertexpos++] = p.position.z
          this.linePositions[vertexpos++] = p2.position.x
          this.linePositions[vertexpos++] = p2.position.y
          this.linePositions[vertexpos++] = p2.position.z

          this.lineColors[colorpos++] = lineColor.r
          this.lineColors[colorpos++] = lineColor.g
          this.lineColors[colorpos++] = lineColor.b
          this.lineColors[colorpos++] = lineColor.r
          this.lineColors[colorpos++] = lineColor.g
          this.lineColors[colorpos++] = lineColor.b

          numConnected++
        }
      }
    }
    //for (let k = 0; k < this.linePositions; k += 6) {
    //  this.lines[k / 6].setPoints(this.linePositions.slice(k, 6), p => 2)
    //}
    this.linesMesh.geometry.setDrawRange(0, numConnected * 2)
    this.linesMesh.geometry.attributes.position.needsUpdate = true
    this.linesMesh.geometry.attributes.color.needsUpdate = true
    // @pointCloud.geometry.attributes.position.needsUpdate = true

    return this.t * 0.001
  }

  onMouseMove(x, y) {
    const c = this.camera
    if (!c.oy) {
      c.oy = c.position.y
      c.ox = c.position.x
      c.oz = c.position.z
    }
    const ang = Math.atan2(c.oz, c.ox)
    const dist = Math.sqrt((c.oz * c.oz) + (c.ox * c.ox))
    const tAng = ang + ((x - 0.5) * 2 * (this.options.mouseCoeffX || 1))
    c.tz = dist * Math.sin(tAng)
    c.tx = dist * Math.cos(tAng)
    c.ty = c.oy + ((y - 0.5) * 20 * (this.options.mouseCoeffY || 1))

    if (!this.rayCaster) {
      // this.rayCaster = new this.THREE.Raycaster()
    }
    this.rcMouseX = (x * 2) - 1
    this.rcMouseY = (- x * 2) + 1
  }

  onRestart() {
    if (this.scene) this.scene.remove(this.linesMesh)
    this.points = []
  }
}
Effect.initClass()
export default KASHIN.register('NET', Effect)

