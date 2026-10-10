import Phaser from 'phaser';

export class AimReticle extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);

    const graphics = scene.add.graphics();
    graphics.lineStyle(3, 0xf3ead0, 0.9);
    graphics.strokeCircle(0, 0, 17);
    graphics.lineBetween(-27, 0, -11, 0);
    graphics.lineBetween(11, 0, 27, 0);
    graphics.lineBetween(0, -27, 0, -11);
    graphics.lineBetween(0, 11, 0, 27);
    graphics.fillStyle(0xd5ad55);
    graphics.fillCircle(0, 0, 3);

    this.add(graphics);
    this.setDepth(200);
  }

  update(pointer: Phaser.Input.Pointer, camera: Phaser.Cameras.Scene2D.Camera): void {
    const point = camera.getWorldPoint(pointer.x, pointer.y);
    const view = camera.worldView;
    this.setPosition(
      Phaser.Math.Clamp(point.x, view.left + 28, view.right - 28),
      Phaser.Math.Clamp(point.y, view.top + 28, view.bottom - 28),
    );
  }
}
