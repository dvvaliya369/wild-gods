import Phaser from 'phaser';

export const LURE_RADIUS = 260;

const LURE_LIFETIME = 6000;

export class MagicalLure extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, startX: number, startY: number, targetX: number, targetY: number) {
    super(scene, startX, startY);
    scene.add.existing(this);

    const glow = scene.add.circle(0, 0, 19, 0xd5ad55, 0.22);
    const core = scene.add.circle(0, 0, 8, 0xf3ead0, 1);
    core.setStrokeStyle(3, 0xd5ad55);
    this.add([glow, core]);
    this.setDepth(80);
    this.setScale(0.7);

    const distance = Phaser.Math.Distance.Between(startX, startY, targetX, targetY);
    scene.tweens.add({
      targets: this,
      x: targetX,
      y: targetY,
      scale: 1,
      angle: 360,
      duration: Phaser.Math.Clamp(distance * 0.8, 220, 430),
      ease: 'Cubic.easeOut',
      onComplete: () => this.land(),
    });
  }

  private readonly land = (): void => {
    this.setAngle(0);
    const attractionArea = new Phaser.Geom.Circle(this.x, this.y, LURE_RADIUS);
    const pulse = this.scene.add
      .circle(this.x, this.y, 20, 0xd5ad55, 0.12)
      .setStrokeStyle(4, 0xf3ead0, 0.6)
      .setDepth(70);

    this.scene.tweens.add({
      targets: pulse,
      radius: LURE_RADIUS,
      alpha: 0,
      duration: 650,
      ease: 'Quad.easeOut',
      onComplete: () => pulse.destroy(),
    });

    this.scene.events.emit('lure-landed', this, attractionArea);
    this.scene.time.delayedCall(LURE_LIFETIME, () => this.expire());
  };

  private readonly expire = (): void => {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 250,
      onComplete: () => this.destroy(),
    });
  };
}
