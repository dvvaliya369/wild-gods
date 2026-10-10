import Phaser from 'phaser';
import { Player } from './Player';

const SHADOW_TEXTURE = 'shadow-enemy-placeholder';
const MAX_HEALTH = 3;
const MOVE_SPEED = 115;
const DETECTION_DISTANCE = 430;
const ATTACK_DISTANCE = 82;
const ATTACK_WINDUP = 560;
const ATTACK_RECOVERY = 680;

type EnemyState = 'idle' | 'chasing' | 'windup' | 'recovering' | 'staggered' | 'defeated';

export class ShadowEnemy extends Phaser.Physics.Arcade.Sprite {
  private enemyState: EnemyState = 'idle';
  private health = MAX_HEALTH;
  private stateEndsAt = 0;
  private telegraph?: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    createShadowTexture(scene);
    super(scene, x, y, SHADOW_TEXTURE);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setDepth(35);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(21, 7, 9);
  }

  update(time: number, player: Player): void {
    if (this.enemyState === 'defeated') return;

    if (this.enemyState === 'staggered') {
      if (time < this.stateEndsAt) return;
      this.clearTint();
      this.enemyState = 'idle';
    }

    if (this.enemyState === 'windup') {
      this.setVelocity(0);
      if (time >= this.stateEndsAt) this.resolveAttack(player);
      return;
    }

    if (this.enemyState === 'recovering') {
      this.setVelocity(0);
      if (time >= this.stateEndsAt) this.enemyState = 'idle';
      return;
    }

    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (distance <= ATTACK_DISTANCE) {
      this.beginAttack(time);
      return;
    }

    if (distance <= DETECTION_DISTANCE) {
      this.enemyState = 'chasing';
      const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      const body = this.body as Phaser.Physics.Arcade.Body;
      this.scene.physics.velocityFromRotation(angle, MOVE_SPEED, body.velocity);
      this.setRotation(angle + Math.PI / 2);
      return;
    }

    this.enemyState = 'idle';
    this.setVelocity(0);
  }

  takeDamage(amount: number, sourceX: number, sourceY: number): boolean {
    if (this.enemyState === 'defeated' || this.enemyState === 'staggered') return false;

    this.health = Math.max(0, this.health - amount);
    this.telegraph?.destroy();
    this.telegraph = undefined;

    if (this.health === 0) {
      this.defeat();
      return true;
    }

    this.enemyState = 'staggered';
    this.stateEndsAt = this.scene.time.now + 240;
    this.setTint(0xe9c6ff);
    const knockback = new Phaser.Math.Vector2(this.x - sourceX, this.y - sourceY);
    if (knockback.lengthSq() === 0) knockback.set(0, 1);
    knockback.normalize().scale(310);
    this.setVelocity(knockback.x, knockback.y);
    return true;
  }

  private beginAttack(time: number): void {
    this.enemyState = 'windup';
    this.stateEndsAt = time + ATTACK_WINDUP;
    this.setVelocity(0);
    this.setTint(0xbd79dc);

    this.telegraph?.destroy();
    this.telegraph = this.scene.add
      .circle(this.x, this.y, ATTACK_DISTANCE, 0xa6486d, 0.12)
      .setStrokeStyle(5, 0xe886a9, 0.9)
      .setDepth(30);
    this.scene.tweens.add({
      targets: this.telegraph,
      alpha: 0.45,
      scale: 0.82,
      yoyo: true,
      repeat: 1,
      duration: ATTACK_WINDUP / 4,
    });
  }

  private resolveAttack(player: Player): void {
    this.telegraph?.destroy();
    this.telegraph = undefined;
    this.clearTint();

    const impact = this.scene.add
      .circle(this.x, this.y, ATTACK_DISTANCE, 0xc65b83, 0.32)
      .setDepth(31);
    this.scene.tweens.add({
      targets: impact,
      alpha: 0,
      scale: 1.25,
      duration: 180,
      onComplete: () => impact.destroy(),
    });

    if (Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= ATTACK_DISTANCE) {
      this.scene.events.emit('shadow-enemy-attack', this.x, this.y, 1);
    }

    this.enemyState = 'recovering';
    this.stateEndsAt = this.scene.time.now + ATTACK_RECOVERY;
  }

  private defeat(): void {
    this.enemyState = 'defeated';
    this.setVelocity(0);
    this.telegraph?.destroy();
    this.telegraph = undefined;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.scene.events.emit('shadow-enemy-defeated', this);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 1.5,
      angle: this.angle + 90,
      duration: 340,
      ease: 'Quad.easeIn',
      onComplete: () => this.destroy(),
    });
  }
}

const createShadowTexture = (scene: Phaser.Scene): void => {
  if (scene.textures.exists(SHADOW_TEXTURE)) return;

  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x08070f, 0.35);
  graphics.fillEllipse(28, 52, 46, 14);
  graphics.fillStyle(0x261c35);
  graphics.fillCircle(28, 30, 23);
  graphics.fillStyle(0x533868);
  graphics.fillTriangle(8, 28, 15, 2, 24, 24);
  graphics.fillTriangle(32, 24, 42, 2, 49, 28);
  graphics.fillStyle(0xe886a9);
  graphics.fillCircle(20, 28, 4);
  graphics.fillCircle(36, 28, 4);
  graphics.generateTexture(SHADOW_TEXTURE, 56, 60);
  graphics.destroy();
};
