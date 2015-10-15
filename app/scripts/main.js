'use strict';

function Application() {
  this.camera = null;
  this.scene = null;
  this.renderer = null;
  this.planet = null;
  this.object = null;
  this.frame = null;

  this.hemiLight = null;
  this.dirLight = null;

  this.objectRotation = {x:0, y:90 * Math.PI / 180, z:0};
  this.objectAcceleration = {x:0, y:0, z:0};

  this.init();
  this.run();
}

Application.prototype = {
  init: function() {
    this.createScene();
  },

  createScene: function() {

    // renderer
    this.renderer = new THREE.WebGLRenderer({antialias:true});
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( this.renderer.domElement );

    // camera
    this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 5000 );
    this.camera.position.z = 300;
    this.camera.position.y = 250;
    this.camera.rotateX(-10 * Math.PI / 180);

    // scene
    this.scene = new THREE.Scene();

    // lights
    this.hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0 );
    this.hemiLight.color.setHSL( 0.6, 1, 0.6 );
    this.hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
    this.hemiLight.position.set( 0, 500, 0 );
    this.scene.add( this.hemiLight );

    var d = 1000;
    this.dirLight = new THREE.DirectionalLight( 0xffffff, 0 );
    this.dirLight.color.setHSL( 0.1, 0.75, 0.7 );
    this.dirLight.position.set( 190, 190, 150 );
    //this.dirLight.castShadow = true;
    //this.dirLight.shadowMapWidth = 2048;
    //this.dirLight.shadowMapHeight = 2048;
    //this.dirLight.shadowCameraLeft = -d;
    //this.dirLight.shadowCameraRight = d;
    //this.dirLight.shadowCameraTop = d;
    //this.dirLight.shadowCameraBottom = -d;
    //this.dirLight.shadowCameraFar = 5000;
    //this.dirLight.shadowBias = -0.00001;
    //this.dirLight.shadowDarkness = 0.35;
    this.scene.add( this.dirLight );

    this.planet = this.createPlanet();
    this.planet.position.y = 750;
    this.scene.add(this.planet);

    //this.createCube();
    this.createSpaceCraft();
  },

  createPlanet: function() {
    return new THREE.Mesh(
      new THREE.SphereGeometry(850, 32, 32),
      //new THREE.MeshBasicMaterial( { color:'#ff0000', wireframe:true } )
      new THREE.MeshPhongMaterial({
        map: THREE.ImageUtils.loadTexture('images/planet.jpg'),
        side: THREE.DoubleSide
      })
    );
  },

  createCube: function() {
    var geometry = new THREE.BoxGeometry( 200, 200, 200 );
    var material = new THREE.MeshBasicMaterial( { color:'#ff0000', wireframe:true } );
    this.object = new THREE.Mesh( geometry, material );
    this.scene.add( this.object );
  },

  createSpaceCraft: function() {

    // load ctm model
    // ctm model conversion through tool "ctmconv"
    var loader = new THREE.CTMLoader();
    loader.load( 'models/manta.ctm',   function( geometry ) {

      // Create mesh
      var material = new THREE.MeshPhongMaterial({color: '#fff', shading:THREE.SmoothShading, shininess:50});
      var mesh = new THREE.Mesh( geometry, material );

      // add to scene
      this.object = mesh;
      this.scene.add( this.object );

      // reset rotation, non animated
      this.resetSpaceCraftRotation(false);

    }.bind( this ), {

      // pass worker instance to the loader (needed to fix the relative path the loader tries to use)
      useWorker: true,
      worker: new Worker( "/bower_components/threejs/examples/js/loaders/ctm/CTMWorker.js" )

    });
  },

  run: function() {

    // animation & interaction loop
    var controllerOptions = { enableGestures: true };
    Leap.loop( controllerOptions, function( frame ) {
      this.frame = frame;
      this.animate();
    }.bind( this ) )
    .use( 'handEntry' )
    .on( 'handFound', function( hand ) {
      this.handleHandFound();
    }.bind( this ) )
    .on('handLost', function( hand ) {
      this.handleHandLost();
    }.bind( this ) );

    // render loop
    TweenMax.ticker.fps(60);
    TweenMax.ticker.addEventListener( 'tick', this.render.bind( this ) );

    // resize
    window.addEventListener( 'resize', this.resize.bind( this ), false );
  },

  animate: function() {
    this.processLeapFrame(this.frame);

    this.planet.rotation.x -= 0.01 + (1 * Math.PI / 180 * this.objectAcceleration.x);
    //this.planet.rotation.y += 0.005 + (1 * Math.PI / 180 * this.objectAcceleration.y);
  },

  handleHandFound: function() {
    this.brightenLights();
  },

  handleHandLost: function() {
    this.dimLights();
    this.resetSpaceCraftRotation();
  },

  dimLights: function() {
    TweenMax.to(this.hemiLight, 0.5, { intensity:0, ease:Power2.easeOut });
    TweenMax.to(this.dirLight, 0.5, { intensity:0, ease:Power2.easeOut });
  },

  brightenLights: function() {
    TweenMax.to(this.hemiLight, 0.5, { intensity:0.6, ease:Circ.easeOut });
    TweenMax.to(this.dirLight, 1, { intensity:1, ease:Circ.easeOut });
  },

  resetSpaceCraftRotation: function(animated) {
    animated = typeof animated !== 'undefined' ? animated : true;
    TweenMax.to(this.objectRotation, animated ? 1.5 : 0, {
      x: 0,
      z: 0,
      onUpdate: this.updateSpaceCraftRotation.bind( this )
    });
  },

  processLeapFrame: function(frame) {

    var str = "";
    for (var i in frame.handsMap) {
      var hand = frame.handsMap[i];

      // correct resting hand
      var rollCorrected = hand.roll() + 0.2362;
      var pitchCorrected = hand.pitch() - 0.3189;
      var yawCorrected = hand.yaw() + 0.1786;


      str += "<strong>Roll:</strong> " + rollCorrected +
        "<br/><strong>Pitch:</strong> " + pitchCorrected +
        "<br/><strong>Yaw:</strong> " + yawCorrected;

      TweenMax.to(this.objectRotation, 1, {
        x: (15 + (pitchCorrected * 35)) * Math.PI / 180,
        y: ((90 + (yawCorrected * -25) ) * Math.PI / 180),
        z: rollCorrected * 35 * Math.PI / 180,
        onUpdate: this.updateSpaceCraftRotation.bind( this )
      });

      this.objectAcceleration.x = (pitchCorrected + 0.3) * -1;
      //this.objectAcceleration.y = (pitchCorrected + 0.3) * -1;

      // camera
      TweenMax.to(this.camera, 1, {fov:75 + ( Math.max(0, pitchCorrected * -30) ), onUpdate:function(){ this.camera.updateProjectionMatrix(); }.bind(this)});

    }


    //console.log(str);
    document.getElementById('out').innerHTML = str;
  },

  updateSpaceCraftRotation: function() {
    var q = this.calculateQuarternion(this.objectRotation);
    this.object.setRotationFromQuaternion(q);
  },

  updatePlanetRotation: function() {
    var q = this.calculateQuarternion(this.planetRotation);
    this.object.setRotationFromQuaternion(q);
  },

  calculateQuarternion: function(objectRotation) {
    var quaternionX = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3(1, 0, 0), objectRotation.x);
    var quaternionY = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3(0, 1, 0), objectRotation.y);
    var quaternionZ = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3(0, 0, 1), objectRotation.z);

    var quaternion = quaternionZ;
    quaternion = quaternion.multiplyQuaternions(quaternion, quaternionX);
    quaternion = quaternion.multiplyQuaternions(quaternion, quaternionY);

    return quaternion;
  },

  render: function() {
    this.renderer.render( this.scene, this.camera );
  },

  resize: function() {

    // update camera
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    // update renderer
    this.renderer.setSize( window.innerWidth, window.innerHeight );
  }
};

new Application();
