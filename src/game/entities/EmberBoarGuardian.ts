import Phaser from 'phaser';
import { configureCircleBody } from '../physics/configureCircleBody';
import { Player } from './Player';

const EMBER_BOAR_TEXTURE = 'ember-boar-placeholder';
const DREAMLAYER_EMBER_BOAR_TEXTURE = 'ember-boar';
const FIRE_RANGE = 460;
const FIRE_HALF_ANGLE = 0.42;
const FIRE_WINDUP = 900;
const FIRE_DURATION = 850;
const EXHAUST_DURATION = 1100;

type BoarState = 'idle' | 'windup' | 'breathing' | 'exhausted' | 'purified';

export class EmberBoarGuardian extends Phaser.Physics.Arcade.Sprite {
  private boarState: BoarState = 'idle';
  private attackTarget?: Phaser.Math.Vector2;
  private fireAngle = 0;
  private stateEndsAt = 0;
  private playerHitThisBreath = false;
  private fireCone?: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    createEmberBoarTexture(scene);
    const texture = scene.textures.exists(DREAMLAYER_EMBER_BOAR_TEXTURE)
      ? DREAMLAYER_EMBER_BOAR_TEXTURE
      : EMBER_BOAR_TEXTURE;
    super(scene, x, y, texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setDepth(45);

    if (texture === DREAMLAYER_EMBER_BOAR_TEXTURE) {
      this.setDisplaySize(200, 200);
    }

    configureCircleBody(this, 42);
  }

  update(time: number, player: Player): void {
    if (this.boarState === 'purified') {
      this.setVelocity(0);
      return;
    }

    if (this.boarState === 'exhausted') {
      this.setVelocity(0);
      if (time >= this.stateEndsAt) {
        this.clearTint();
        this.boarState = 'idle';
        if (this.attackTarget) {
          const target = this.attackTarget.clone();
          this.attackTarget = undefined;
          this.startWindup(time, target.x, target.y);
        }
      }
      return;
    }

    if (this.boarState === 'windup') {
      this.setVelocity(0);
      if (time >= this.stateEndsAt) this.beginFire(time);
      return;
    }

    if (this.boarState === 'breathing') {
      this.setVelocity(0);
      if (
        !this.playerHitThisBreath
        && this.containsFire(player.x, player.y)
      ) {
        this.playerHitThisBreath = true;
        this.scene.events.emit('guardian-attack', this.x, this.y, 2);
      }
      if (time >= this.stateEndsAt) this.finishFire(time);
      return;
    }

    this.boarState = 'idle';
    this.setVelocity(0);
  }

  triggerAnchorAttack(attackTarget: Phaser.Math.Vector2): boolean {
    if (!['idle', 'exhausted'].includes(this.boarState)) return false;

    if (this.boarState === 'exhausted') {
      this.attackTarget = attackTarget.clone();
      return true;
    }
    this.startWindup(this.scene.time.now, attackTarget.x, attackTarget.y);
    return true;
  }

  isBreathingFire(): boolean {
    return this.boarState === 'breathing';
  }

  shiftTimers(duration: number): void {
    this.stateEndsAt += duration;
  }

  containsFire(x: number, y: number): boolean {
    if (!this.isBreathingFire()) return false;

    const distance = Phaser.Math.Distance.Between(this.x, this.y, x, y);
    if (distance > FIRE_RANGE) return false;

    const targetAngle = Phaser.Math.Angle.Between(this.x, this.y, x, y);
    return Math.abs(Phaser.Math.Angle.Wrap(targetAngle - this.fireAngle)) <= FIRE_HALF_ANGLE;
  }

  onAnchorBurned(): void {
    if (!this.isBreathingFire()) return;
    this.finishFire(this.scene.time.now);
    this.scene.cameras.main.shake(200, 0.01);
    this.scene.events.emit('ember-boar-exhausted');
  }

  purify(silent = false): void {
    if (this.boarState === 'purified') return;

    this.boarState = 'purified';
    this.setVelocity(0);
    this.fireCone?.destroy();
    this.fireCone = undefined;
    this.clearTint();
    this.setTint(0xf3c76b);

    if (silent) return;

    const pulse = this.scene.add
      .circle(this.x, this.y, 48, 0xf3c76b, 0.3)
      .setStrokeStyle(6, 0xffead0, 0.85)
      .setDepth(40);
    this.scene.tweens.add({
      targets: pulse,
      radius: 320,
      alpha: 0,
      duration: 900,
      onComplete: () => pulse.destroy(),
    });
    this.scene.events.emit('ember-boar-purified');
  }

  private startWindup(time: number, targetX: number, targetY: number): void {
    this.boarState = 'windup';
    this.stateEndsAt = time + FIRE_WINDUP;
    this.fireAngle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    this.setRotation(this.fireAngle + Math.PI / 2);
    this.setTint(0xff9a58);
    this.drawFireCone(0x9d4a38, 0.16, 0xe88668, 0.65);
    this.scene.tweens.add({
      targets: this.fireCone,
      alpha: 0.35,
      yoyo: true,
      repeat: 2,
      duration: FIRE_WINDUP / 6,
    });
  }

  private beginFire(time: number): void {
    this.boarState = 'breathing';
    this.stateEndsAt = time + FIRE_DURATION;
    this.playerHitThisBreath = false;
    this.setTint(0xffcf73);
    this.drawFireCone(0xf06a32, 0.3, 0xffc15d, 0.9);
    this.scene.cameras.main.shake(100, 0.003);
  }

  private finishFire(time: number): void {
    this.fireCone?.destroy();
    this.fireCone = undefined;
    this.boarState = 'exhausted';
    this.stateEndsAt = time + EXHAUST_DURATION;
    this.setTint(0x8c6d65);
    this.setVelocity(0);
  }

  private drawFireCone(
    fillColor: number,
    fillAlpha: number,
    lineColor: number,
    lineAlpha: number,
  ): void {
    const leftAngle = this.fireAngle - FIRE_HALF_ANGLE;
    const rightAngle = this.fireAngle + FIRE_HALF_ANGLE;
    const leftX = this.x + Math.cos(leftAngle) * FIRE_RANGE;
    const leftY = this.y + Math.sin(leftAngle) * FIRE_RANGE;
    const rightX = this.x + Math.cos(rightAngle) * FIRE_RANGE;
    const rightY = this.y + Math.sin(rightAngle) * FIRE_RANGE;

    this.fireCone?.destroy();
    this.fireCone = this.scene.add.graphics().setDepth(32);
    this.fireCone.fillStyle(fillColor, fillAlpha);
    this.fireCone.fillTriangle(this.x, this.y, leftX, leftY, rightX, rightY);
    this.fireCone.lineStyle(4, lineColor, lineAlpha);
    this.fireCone.strokeTriangle(this.x, this.y, leftX, leftY, rightX, rightY);
  }

}

const createEmberBoarTexture = (scene: Phaser.Scene): void => {
  if (scene.textures.exists(EMBER_BOAR_TEXTURE)) return;

  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x140c09, 0.3);
  graphics.fillEllipse(70, 108, 100, 25);
  graphics.fillStyle(0x7d3d2c);
  graphics.fillEllipse(70, 72, 92, 82);
  graphics.fillCircle(70, 40, 32);
  graphics.fillStyle(0xe89a52);
  graphics.fillTriangle(39, 35, 23, 15, 48, 26);
  graphics.fillTriangle(101, 35, 117, 15, 92, 26);
  graphics.fillStyle(0xffc15d);
  graphics.fillCircle(59, 39, 5);
  graphics.fillCircle(81, 39, 5);
  graphics.fillStyle(0xe7d2a2);
  graphics.fillTriangle(50, 58, 40, 73, 56, 65);
  graphics.fillTriangle(90, 58, 100, 73, 84, 65);
  graphics.generateTexture(EMBER_BOAR_TEXTURE, 140, 140);
  graphics.destroy();
};
