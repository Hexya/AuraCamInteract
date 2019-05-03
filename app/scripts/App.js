import {TweenMax, Power2, TimelineLite} from "gsap/TweenMax";
import * as dat from 'dat.gui';

//TEXTURE
import imgMap from '../assets/Texture/Leather/Leather_001_NRM.png';
import imgDisp from '../assets/Texture/Leather/Leather_001_DISP.png';
import disc from '../assets/Texture/disc.png';

//SHADER
import landscapeVertexShader from './Shaders/LandscapeShader/landscapeVertex.glsl';
import landscapeFragmentShader from './Shaders/LandscapeShader/landscapeFragment.glsl';
import glowVertexShader from './Shaders/GlowShader/glowVertex.glsl';
import glowFragmentShader from './Shaders/GlowShader/glowFragment.glsl';

//POST PROC
import 'three/examples/js/postprocessing/EffectComposer';
import 'three/examples/js/postprocessing/RenderPass';
import 'three/examples/js/postprocessing/ShaderPass';
import 'three/examples/js/shaders/CopyShader'

import 'three/examples/js/shaders/DotScreenShader'
import 'three/examples/js/shaders/LuminosityHighPassShader';
import 'three/examples/js/postprocessing/UnrealBloomPass';


let composer;
let params = {
    exposure: 1,
    bloomStrength: 1.7,
    bloomThreshold: 0.3,
    bloomRadius: 0.01
};

let movemento = 0;
let nbParticules = 10;
let Stats = require('stats-js');
let OrbitControls = require('three-orbitcontrols');
//let InstancedMesh = require('three-instanced-mesh')( THREE );

export default class App {

    constructor() {

        this.pollen = [];
        this.acces = true;
        this.posAuraX = [];
        this.posAuraY = [];
        this.lastMovemento = [];
        this.container = document.querySelector( '#main' );
    	document.body.appendChild( this.container );

        //STATS
        this.stats();

        this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 10 );
        this.camera.position.z = 3.5;
        this.controls = new OrbitControls(this.camera) // ==> ORBITCONTROLS HERE

    	this.scene = new THREE.Scene();

        this.groupPollen = new THREE.Group();
        this.groupLine = new THREE.Group();

        //LANDSCAPE
        this.landscape();

        //LIGHT
        this.newLight();

        //POLLEN GENERATION
        this.auraCreate();
        //this.particulesCreate(.1);

        //GLOW SPHERE
        this.glowSphere(1);

        //Gui
        const gui = new dat.GUI();
        gui.add( params, 'bloomThreshold', 0.0, 1.0 ).onChange( function ( value ) {
            bloomPass.threshold = Number( value );
        } );
        gui.add( params, 'bloomStrength', 0.0, 3.0 ).onChange( function ( value ) {
            bloomPass.strength = Number( value );
        } );
        gui.add( params, 'bloomRadius', 0.0, 1.0 ).step( 0.01 ).onChange( function ( value ) {
            bloomPass.radius = Number( value );
        } );

    	//ORIGINAL RENDERER
    	/*this.renderer = new THREE.WebGLRenderer( { antialias: true } );
    	this.renderer.setPixelRatio( window.devicePixelRatio );
    	this.renderer.setSize( window.innerWidth, window.innerHeight );
    	this.container.appendChild( this.renderer.domElement );

    	window.addEventListener('resize', this.onWindowResize.bind(this), false);
        this.onWindowResize();
        this.renderer.animate( this.render.bind(this));*/

        this.renderer = new THREE.WebGLRenderer( { antialias: true } );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.container.appendChild( this.renderer.domElement );

        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        this.onWindowResize();
    	//BLOOM RENDER
        let renderScene = new THREE.RenderPass( this.scene, this.camera );
        let bloomPass = new THREE.UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
        //bloomPass.renderToScreen = true;
        bloomPass.threshold = params.bloomThreshold;
        bloomPass.strength = params.bloomStrength;
        bloomPass.radius = params.bloomRadius;
        composer = new THREE.EffectComposer( this.renderer );
        composer.setSize( window.innerWidth, window.innerHeight );
        composer.addPass( renderScene );
        composer.addPass( bloomPass );
        //Add to fixe
        let copyPass = new THREE.ShaderPass(THREE.CopyShader);
        copyPass.renderToScreen = true;
        composer.addPass(copyPass)

        this.renderer.animate( this.render.bind(this));
    }


    landscape() {
        this.landscapeGeometry = new THREE.SphereBufferGeometry(5, 20, 20)

        this.uniforms = {
            uTime: { type: 'f', value: 0},
            uAmp: { type:'f', value: 2. },
        };
        this.landscapeMaterial = new THREE.ShaderMaterial({
            transparent: true,
            uniforms: this.uniforms,
            vertexShader: landscapeVertexShader,
            fragmentShader: landscapeFragmentShader,
            side: THREE.BackSide
        });

        this.landscapeMesh = new THREE.Mesh( this.landscapeGeometry, this.landscapeMaterial );
        this.scene.add(this.landscapeMesh)
    }

    newLight() {
        this.ambientLight = new THREE.AmbientLight( 0x404040 ); // soft white light
        this.scene.add( this.ambientLight);

        this.dirLight = new THREE.DirectionalLight( 0xffffff, 8 );//Power light
        this.dirLight.castShadow = true;
        this.dirLight.position.set(0,0,0);
        this.scene.add(this.dirLight);

        this.dirLightHelper = new THREE.DirectionalLightHelper( this.dirLight, 10 );
        this.scene.add( this.dirLightHelper );

        let sphereSize = 0.1;
        this.pointLight = new THREE.PointLight( 0x020202, 1, 100 ); //0xffeea1
        this.scene.add( this.pointLight );

        this.pointLightHelper = new THREE.PointLightHelper( this.pointLight, sphereSize );
        //this.scene.add( this.pointLightHelper );

        this.pointLightCircle = new THREE.PointLight( 0xdddddd, 1, 100 ); //0xffeea1
        this.scene.add( this.pointLightCircle );
        this.pointLightCircle.position.z = 1;

        this.pointLightCircleHelper = new THREE.PointLightHelper( this.pointLightCircle, sphereSize );
        //this.scene.add( this.pointLightCircleHelper );
    }

    auraCreate() {
        let rayon = 0.7;
        for(let x = 0 ; x < nbParticules; x++) {
            for(let y = 0 ; y < nbParticules; y++) {
                let rand = Math.random()*0.1;
                let geometry = new THREE.SphereBufferGeometry(rand, 8, 7 );
                let material = new THREE.MeshPhongMaterial({color:0xfffffff, transparent:true, opacity: 1-(rand*15)});
                this.mesh = new THREE.Mesh( geometry, material );

                this.mesh.position.x = THREE.Math.randFloat(rayon, rayon+ (rand*10) * 2) * Math.cos(y) * Math.sin(x);
                this.mesh.position.y = THREE.Math.randFloat(rayon, rayon+ (rand*10) * 1.1) * Math.sin(y) * Math.sin(x);
                this.mesh.position.z = -rand*10;

                this.posAuraX.push(this.mesh.position.x)
                this.posAuraY.push(this.mesh.position.y)

                let scale = THREE.Math.randFloat(.3, 3)
                let scale2 = THREE.Math.randFloat(.8, 1.2)
                this.mesh.scale.set(scale*(scale2), scale, 0.001)

                //BEGIN ANIMATION
                if(this.mesh.position.x != 0) {
                    this.groupPollen.add(this.mesh);
                }
            }
                this.scene.add(this.groupPollen);
        }
        console.log(this.posAuraX)
    }
    particulesCreate(rayon) {

        let geometry = new THREE.BufferGeometry();
        let vertices = [];
        let sprite = new THREE.TextureLoader().load( disc );

        for(let x = 0 ; x < nbParticules; x++) {
            for (let y = 0; y < nbParticules; y++) {
                let rand = Math.random()*0.1;
                let randSize = THREE.Math.randFloat(1, 10);

                let posx = THREE.Math.randFloat(rayon, rayon + (rand*10) * 2) * Math.cos(y) * Math.sin(x);
                let posy = THREE.Math.randFloat(rayon, rayon + (rand*10) * 1.1) * Math.sin(y) * Math.sin(x);
                let posz = -rand*11;

                vertices.push(posx, posy, posz);

                geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );

                let material = new THREE.PointsMaterial( { size: randSize, sizeAttenuation: false, map: sprite, alphaTest: 0.5, transparent: true } );
                material.color.setHSL( 1.0, 0.3, 0.7 );

                this.mesh = new THREE.Points( geometry, material );

                let scale = THREE.Math.randFloat(1, 30)
                //this.mesh.scale.set(rand*100, rand*100, rand*100)
                this.mesh.material.size = scale;
                //console.log(this.mesh.material.size)

                this.groupPollen.add(this.mesh);
                this.scene.add(this.groupPollen);
                //this.groupPollen.rotation.x = groupRotation;
                //this.groupPollen.rotation.x = Math.PI/2;
                //this.groupPollen.rotation.y = Math.PI/2;
                //this.groupPollen.rotation.z = Math.PI/2;
            }
        }
    }

    generateRandom(min, max) {
        let num = Math.floor(Math.random() * (max - min + 1)) + min;
        return (num === 0) ? this.generateRandom(min, max) : num;
    }

    glowSphere(positionz) {

        let sphereGeom = new THREE.SphereGeometry(1.3, 32, 16);

        let customMaterial = new THREE.ShaderMaterial(
            {
                uniforms:
                    {
                        "c":   { type: "f", value: 0.3 },
                        "p":   { type: "f", value: 4 },
                        glowColor: { type: "c", value: new THREE.Color(0x22DDBB) }, //0x0069ff clearly
                        viewVector: { type: "v3", value: this.camera.position }
                    },
                vertexShader: glowVertexShader,
                fragmentShader: glowFragmentShader,
                side: THREE.FrontSide,
                blending: THREE.AdditiveBlending,
                transparent: true
            }   );

        this.moonGlow = new THREE.Mesh( sphereGeom, customMaterial);
        this.moonGlow.position.z = positionz;
        this.scene.add( this.moonGlow );
    }

    render(t) {
        this.stats.begin()

        let time = Date.now()/1000;
        this.landscapeMaterial.uniforms.uTime.value += time /100000000000;
        let random = Math.floor(Math.random()*(this.groupPollen.children.length-1));
        movemento = document.querySelector('#score').innerText /10000;

        if(movemento > 0.03) {
            this.lastMovemento.push(movemento);
            //console.log(this.lastMovemento)
        }

        //GROUP MOVEMENT
        //this.groupPollen.position.z = - movemento*3;
        //this.groupPollen.rotation.x += ((groupRotation + (movemento)) - this.groupPollen.rotation.x) * 0.5;
        //this.groupPollen.rotation.y += ((groupRotation + (movemento)) - this.groupPollen.rotation.y) * 0.5;

        //LIGHT MOVEMENT
        this.pointLight.position.x = Math.cos(t / 752) * .1;
        this.pointLight.position.y = Math.sin(t / 438) * .1;
        this.pointLight.position.z = Math.sin(t / 678) * .1;
        //this.pointLight.position.z = -.5;
        this.pointLightCircle.position.x = Math.cos(t / 678) *1.6;
        this.pointLightCircle.position.y = Math.sin(t / 678) *1.6;

        //HEART MOVEMENT
        let scaling = 1 + Math.abs(Math.sin(t/1000)*.05)

        for ( let i = 0; i < this.groupPollen.children.length; i ++ ) {
            this.groupPollen.children[i].material.needsUpdate = true;
            //POLLEN POSITION
            this.groupPollen.position.z = 1.1;
            this.groupPollen.children[i].position.x += Math.cos((t * 0.001) + this.groupPollen.children[i].position.x) * 0.01;
            this.groupPollen.children[i].position.y += Math.sin((t * 0.001) + this.groupPollen.children[i].position.y) * 0.02;
            this.groupPollen.children[i].position.z += Math.sin((t * 0.001) + this.groupPollen.children[i].position.z) * 0.0005;

            this.groupPollen.children[i].scale.x += Math.sin((t * 0.001) + this.groupPollen.children[i].position.x) * (Math.random()*0.005);
            this.groupPollen.children[i].scale.y += Math.sin((t * 0.002) + this.groupPollen.children[i].position.z) * (Math.random()*0.005);
        }

        //if(movemento > 0.08) {
        if(this.lastMovemento[this.lastMovemento.length-1] > 0.05) {
            //console.log(movemento)
            console.log(this.lastMovemento[this.lastMovemento.length-1])
            for (let i = 0; i < this.groupPollen.children.length; i++) {

                let tl = new TimelineLite();
                tl.to(this.groupPollen.children[i].position, 2, {
                    x: this.groupPollen.children[i].position.x * (this.lastMovemento[this.lastMovemento.length-1] * (Math.random()*25)),
                    y: this.groupPollen.children[i].position.y * (this.lastMovemento[this.lastMovemento.length-1] * (Math.random()*25)),
                    ease: Sine.easeOut
                });

            }
        } else {
            for (let i = 0; i < this.groupPollen.children.length; i++) {

                let tl = new TimelineLite();
                tl.to(this.groupPollen.children[i].position, 2, {
                    x: this.posAuraX[i],
                    y: this.posAuraY[i],
                    ease: Sine.easeOut
                });

            }
        }
        //LOW MOVEMENT
        /*
        if(movemento > 0.08 && this.acces == true){
            this.acces = false;
            console.log(movemento)
            for ( let i = 0; i < this.groupPollen.children.length; i ++ ) {
                ////// let tl = new TimelineLite();
                //tl.to(this.groupPollen.children[random].position, 2 , { x:this.groupPollen.children[random].position.x + Math.cos(2), y:this.groupPollen.children[random].position.y + Math.sin(2), ease:Elastic.easeOut, useFrames:true})
                tl.to(this.groupPollen.children[i].position, 2, {x:.6, y:.6, ease: Elastic.easeOut})
                tl.delayedCall(1, reverse)

                function reverse() {
                    tl.reverse();
                } ///////

                let gsapTween = TweenMax.to(this.groupPollen.children[i].position, 2, {x:.6, y:.6, ease:Sine.easeOut});

                TweenLite.delayedCall(2, gsapTween.reverse)

                //webgl.camera.position.x += ((cameraTarget.x - webgl.camera.position.x) * 0.05);
                //this.groupPollen.children[i].position.x += ((movemento - this.groupPollen.children[i].position.x) * 0.05);
                //this.groupPollen.position.z += (((-movemento*10) - this.groupPollen.position.z) *0.0005);

                setTimeout(()=> {
                    this.acces= true;
                },4000)
            }

            //      x: Math.random() * (60 + 30) - 30,
              //      y: Math.random() * (40 + 20) - 20,
                //    z: Math.random() * (50 + 30) - 30,
        }
        */
        //STRONG MOVEMENT
        /*
        if(movemento > 0.15){
            let tl = new TimelineLite();
            //tl.to(this.groupPollen.children[random].position, 2 , { x:this.groupPollen.children[random].position.x + Math.cos(2), y:this.groupPollen.children[random].position.y + Math.sin(2), ease:Elastic.easeOut, useFrames:true})
            tl.to(this.groupPollen.children[random].position, 20 , { x:Math.random() * (60 + 30 ) - 30, y:Math.random() * (40 + 20 ) - 20, z:Math.random() * (50 + 30 ) - 30, ease:Elastic.easeOut, useFrames:true})
            setTimeout(()=>{
                tl.reverse()
            },400)
        }
        */
        //RENDER
        //this.renderer.render( this.scene, this.camera ); //Default
        composer.render(); //Bloom
        this.stats.end();
    }

    onWindowResize() {

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );
    }

    stats() {
        this.stats = new Stats();
        this.stats.setMode(0); // 0: fps, 1: ms
        this.stats.domElement.style.position = 'absolute';
        this.stats.domElement.style.top = '0px';
        this.stats.domElement.style.left = '0px';
        document.body.appendChild( this.stats.domElement );
    }
}
