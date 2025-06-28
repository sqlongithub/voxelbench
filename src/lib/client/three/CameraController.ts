import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';

// Define types for better type safety
interface TweenResult {
  cameraTween: TWEEN.Tween<THREE.Vector3>;
  targetTween: TWEEN.Tween<THREE.Vector3>;
}

interface OrbitControls {
  target: THREE.Vector3;
  update(): void;
}

class CameraController {
  public camera: THREE.Camera;
  private orbitControls: OrbitControls;
  private activeTweens: TWEEN.Tween<any>[] = [];
  private raycaster: THREE.Raycaster = new THREE.Raycaster();

  constructor(camera: THREE.Camera, orbitControls: OrbitControls) {
    this.camera = camera;
    this.orbitControls = orbitControls;
  }

  public dispose(): void {
    // Dispose of any resources if necessary
    this.cancelAllTweens();
    this.orbitControls = null as any; // Clear reference to orbit controls
  }



  public resize(width: number, height: number): void {
    if ((this.camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      (this.camera as THREE.PerspectiveCamera).aspect = width / height;
      (this.camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    } else if ((this.camera as THREE.OrthographicCamera).isOrthographicCamera) {
      (this.camera as THREE.OrthographicCamera).updateProjectionMatrix();
    }
  }

  /**
   * Cancel all active tweens
   */
  public cancelAllTweens(): void {
    this.activeTweens.forEach((tween: TWEEN.Tween<any>) => {
      tween.stop();
    });
    this.activeTweens = [];
  }

  public update(): void {
    // Update TWEEN animations
    TWEEN.update();
    
    // Update orbit controls
    this.orbitControls.update();
  }

  /**
   * Smoothly transition the orbit controls target to a new position
   */
  public tweenToTarget(
    newTarget: THREE.Vector3, 
    duration: number = 1000
  ): TWEEN.Tween<THREE.Vector3> {
    // Cancel any existing tweens first
    this.cancelAllTweens();
    
    const startTarget: THREE.Vector3 = this.orbitControls.target.clone();
    
    const tween = new TWEEN.Tween(startTarget)
      .to(newTarget, duration)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        this.orbitControls.target.copy(startTarget);
        this.orbitControls.update();
      })
      .onComplete(() => {
        // Remove from active tweens when complete
        this.activeTweens = this.activeTweens.filter((t: TWEEN.Tween<any>) => t !== tween);
      })
      .onStop(() => {
        // Remove from active tweens when stopped
        this.activeTweens = this.activeTweens.filter((t: TWEEN.Tween<any>) => t !== tween);
      })
      .start();
    
    // Track this tween
    this.activeTweens.push(tween);
    
    return tween;
  }

  /**
   * Transition both camera position and target to focus on a specific object
   */
  public tweenCameraToObject(
    targetObject: THREE.Object3D, 
    cameraDistance: number = 10, 
    duration: number = 1500
  ): TweenResult {
    this.cancelAllTweens();
    
    const targetPosition = new THREE.Vector3();
    targetObject.getWorldPosition(targetPosition);
    
    // Calculate new camera position
    const direction: THREE.Vector3 = this.camera.position
      .clone()
      .sub(this.orbitControls.target)
      .normalize();
    const newCameraPosition: THREE.Vector3 = targetPosition
      .clone()
      .add(direction.multiplyScalar(cameraDistance));
    
    const startCameraPos: THREE.Vector3 = this.camera.position.clone();
    const startTarget: THREE.Vector3 = this.orbitControls.target.clone();
    
    // Create tweens for both camera position and target
    const cameraTween = new TWEEN.Tween(startCameraPos)
      .to(newCameraPosition, duration)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        this.camera.position.copy(startCameraPos);
      })
      .onComplete(() => {
        this.activeTweens = this.activeTweens.filter((t: TWEEN.Tween<any>) => t !== cameraTween);
      })
      .onStop(() => {
        this.activeTweens = this.activeTweens.filter((t: TWEEN.Tween<any>) => t !== cameraTween);
      });
    
    const targetTween = new TWEEN.Tween(startTarget)
      .to(targetPosition, duration)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        this.orbitControls.target.copy(startTarget);
        this.orbitControls.update();
      })
      .onComplete(() => {
        this.activeTweens = this.activeTweens.filter((t: TWEEN.Tween<any>) => t !== targetTween);
      })
      .onStop(() => {
        this.activeTweens = this.activeTweens.filter((t: TWEEN.Tween<any>) => t !== targetTween);
      });
    
    // Start both tweens
    cameraTween.start();
    targetTween.start();
    
    // Track both tweens
    this.activeTweens.push(cameraTween, targetTween);
    
    return { cameraTween, targetTween };
  }

  /**
   * Chain multiple target transitions in sequence
   */
  public tweenSequence(
    targets: THREE.Vector3[], 
    duration: number = 1000, 
    delay: number = 0
  ): void {
    this.cancelAllTweens();
    
    targets.forEach((target: THREE.Vector3, index: number) => {
      const startDelay: number = index * (duration + delay);
      
      const tween = new TWEEN.Tween(this.orbitControls.target)
        .to(target, duration)
        .delay(startDelay)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(() => {
          this.orbitControls.update();
        })
        .onComplete(() => {
          this.activeTweens = this.activeTweens.filter((t: TWEEN.Tween<any>) => t !== tween);
        })
        .onStop(() => {
          this.activeTweens = this.activeTweens.filter((t: TWEEN.Tween<any>) => t !== tween);
        })
        .start();
      
      this.activeTweens.push(tween);
    });
  }

  /**
   * Focus on object with custom approach angle
   */
  public focusOnObject(
    object: THREE.Object3D,
    distance: number = 10,
    duration: number = 1000,
    approachAngle?: THREE.Vector3
  ): TweenResult {
    this.cancelAllTweens();

    // Get object's world position
    const targetPosition = new THREE.Vector3();
    object.getWorldPosition(targetPosition);

    // Use custom approach angle or maintain current direction
    const direction: THREE.Vector3 = approachAngle 
      ? approachAngle.clone().normalize()
      : this.camera.position.clone().sub(this.orbitControls.target).normalize();
    
    const newCameraPosition: THREE.Vector3 = targetPosition
      .clone()
      .add(direction.multiplyScalar(distance));

    const startCameraPos: THREE.Vector3 = this.camera.position.clone();
    const startTarget: THREE.Vector3 = this.orbitControls.target.clone();

    const cameraTween = new TWEEN.Tween(startCameraPos)
      .to(newCameraPosition, duration)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        this.camera.position.copy(startCameraPos);
      })
      .onComplete(() => {
        this.activeTweens = this.activeTweens.filter((t: TWEEN.Tween<any>) => t !== cameraTween);
      })
      .onStop(() => {
        this.activeTweens = this.activeTweens.filter((t: TWEEN.Tween<any>) => t !== cameraTween);
      });

    const targetTween = new TWEEN.Tween(startTarget)
      .to(targetPosition, duration)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        this.orbitControls.target.copy(startTarget);
        this.orbitControls.update();
      })
      .onComplete(() => {
        this.activeTweens = this.activeTweens.filter((t: TWEEN.Tween<any>) => t !== targetTween);
      })
      .onStop(() => {
        this.activeTweens = this.activeTweens.filter((t: TWEEN.Tween<any>) => t !== targetTween);
      });

    cameraTween.start();
    targetTween.start();

    this.activeTweens.push(cameraTween, targetTween);

    return { cameraTween, targetTween };
  }

  /**
   * Get the number of currently active tweens
   */
  public getActiveTweenCount(): number {
    return this.activeTweens.length;
  }

  /**
   * Check if any tweens are currently running
   */
  public isAnimating(): boolean {
    return this.activeTweens.length > 0;
  }
}

// Usage example with types
export default CameraController;

// Example usage:
/*
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const orbitControls = new OrbitControls(camera, renderer.domElement);
const cameraController = new CameraController(camera, orbitControls);

// Single transition
cameraController.tweenToTarget(new THREE.Vector3(5, 0, 5), 2000);

// Focus on object
const mesh = new THREE.Mesh(geometry, material);
cameraController.focusOnObject(mesh, 15, 2000);

// Multiple targets in sequence
const waypoints: THREE.Vector3[] = [
  new THREE.Vector3(5, 0, 5),
  new THREE.Vector3(-5, 0, 5),
  new THREE.Vector3(0, 5, 0)
];
cameraController.tweenSequence(waypoints, 1000, 500);

// Cancel all if needed
document.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    cameraController.cancelAllTweens();
  }
});
*/