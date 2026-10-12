import Phaser from 'phaser';
import { configureCircleBody } from '../physics/configureCircleBody';
import { Player } from './Player';

const MOON_STAG_TEXTURE = 'moon-stag-placeholder';
const DREAMLAYER_MOON_STAG_TEXTURE = 'moon-stag';
const CHARGE_SPEED = 720;
const CHARGE_WINDUP = 820;
const CHARGE_DURATION = 900;
const CHARGE_HIT_DISTANCE = 72;
const STUN_DURATION = 1000;

type GuardianState = 'idle' | 'windup' | 'charging' | 'stunned' | 'purified';

export class MoonStagGuardian extends Phaser.Physics.Arcade.Sprite {
  private guardianState: GuardianState = 'idle';
  private attackTarget?: Phaser.Math.Vector2;
  private readonly chargeDirection = new Phaser.Math.Vector2(0, 1);
  private stateEndsAt = 0;
  private playerHitThisCharge = false;
  private telegraph?: Phaser.GameObjects.Graphics;
  private lastTrailAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    createMoonStagTexture(scene);
    const texture = scene.textures.exists(DREAMLAYER_MOON_STAG_TEXTURE)
      ? DREAMLAYER_MOON_STAG_TEXTURE
      : MOON_STAG_TEXTURE;
    super(scene, x, y, texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setDepth(45);

    if (texture === DREAMLAYER_MOON_STAG_TEXTURE) {
      this.setDisplaySize(180, 180);
    }

    configureCircleBody(this, 40);
  }

  update(time: number, player: Player): void {
    if (this.guardianState === 'purified') {
      this.setVelocity(0);
      return;
    }

    if (this.guardianState === 'stunned') {
      this.setVelocity(0);
      if (time >= this.stateEndsAt) {
        this.clearTint();
        this.guardianState = 'idle';
        if (this.attackTarget) {
          const target = this.attackTarget.clone();
          this.attackTarget = undefined;
          this.startWindup(time, target.x, target.y);
        }
      }
      return;
    }

    if (this.guardianState === 'windup') {
      this.setVelocity(0);
      if (time >= this.stateEndsAt) this.beginCharge(time);
      return;
    }

    if (this.guardianState === 'charging') {
      this.updateCharge(time, player);
      return;
    }

    this.guardianState = 'idle';
    this.setVelocity(0);
  }

  triggerAnchorAttack(attackTarget: Phaser.Math.Vector2): boolean {
    if (!['idle', 'stunned'].includes(this.guardianState)) return false;

    if (this.guardianState === 'stunned') {
      this.attackTarget = attackTarget.clone();
      return true;
    }
    this.startWindup(this.scene.time.now, attackTarget.x, attackTarget.y);
    return true;
  }

  isCharging(): boolean {
    return this.guardianState === 'charging';
  }

  isPurified(): boolean {
    return this.guardianState === 'purified';
  }

  shiftTimers(duration: number): void {
    this.stateEndsAt += duration;
    this.lastTrailAt += duration;
  }

  onAnchorHit(): void {
    if (!this.isCharging()) return;

    this.setVelocity(0);
    this.guardianState = 'stunned';
    this.stateEndsAt = this.scene.time.now + STUN_DURATION;
    this.setTint(0xf1d78b);
    this.attackTarget = undefined;
    this.scene.cameras.main.shake(220, 0.012);
    this.scene.events.emit('moon-stag-stunned');
  }

  purify(silent = false): void {
    if (this.guardianState === 'purified') return;

    this.guardianState = 'purified';
    this.setVelocity(0);
    this.telegraph?.destroy();
    this.telegraph = undefined;
    this.clearTint();
    this.setTint(0x8fe0c5);

    if (silent) return;

    const pulse = this.scene.add
      .circle(this.x, this.y, 45, 0x8fe0c5, 0.32)
      .setStrokeStyle(6, 0xf3ead0, 0.85)
      .setDepth(40);
    this.scene.tweens.add({
      targets: pulse,
      radius: 310,
      alpha: 0,
      duration: 900,
      ease: 'Quad.easeOut',
      onComplete: () => pulse.destroy(),
    });
    this.scene.events.emit('moon-stag-purified');
  }

  private startWindup(time: number, targetX: number, targetY: number): void {
    this.guardianState = 'windup';
    this.stateEndsAt = time + CHARGE_WINDUP;
    this.chargeDirection.set(targetX - this.x, targetY - this.y);
    if (this.chargeDirection.lengthSq() === 0) this.chargeDirection.set(0, 1);
    this.chargeDirection.normalize();
    this.setRotation(this.chargeDirection.angle() + Math.PI / 2);
    this.setTint(0xc99bec);

    const endX = this.x + this.chargeDirection.x * 760;
    const endY = this.y + this.chargeDirection.y * 760;
    this.telegraph?.destroy();
    this.telegraph = this.scene.add.graphics().setDepth(32);
    this.telegraph.lineStyle(16, 0x9d4f7c, 0.18);
    this.telegraph.lineBetween(this.x, this.y, endX, endY);
    this.telegraph.lineStyle(4, 0xe886a9, 0.9);
    this.telegraph.lineBetween(this.x, this.y, endX, endY);
    this.scene.tweens.add({
      targets: this.telegraph,
      alpha: 0.25,
      yoyo: true,
      repeat: 2,
      duration: CHARGE_WINDUP / 6,
    });
  }

  private beginCharge(time: number): void {
    this.telegraph?.destroy();
    this.telegraph = undefined;
    this.clearTint();
    this.guardianState = 'charging';
    this.stateEndsAt = time + CHARGE_DURATION;
    this.playerHitThisCharge = false;
    this.setVelocity(
      this.chargeDirection.x * CHARGE_SPEED,
      this.chargeDirection.y * CHARGE_SPEED,
    );
    this.scene.events.emit('moon-stag-charge-start');
  }

  private updateCharge(time: number, player: Player): void {
    if (time >= this.stateEndsAt) {
      this.setVelocity(0);
      this.guardianState = 'stunned';
      this.stateEndsAt = time + STUN_DURATION;
      this.setTint(0xf1d78b);
      return;
    }

    if (time >= this.lastTrailAt + 70) {
      this.lastTrailAt = time;
      const trail = this.scene.add
        .ellipse(this.x, this.y, 90, 52, 0xd5ad55, 0.18)
        .setDepth(33);
      this.scene.tweens.add({
        targets: trail,
        alpha: 0,
        scale: 1.5,
        duration: 260,
        onComplete: () => trail.destroy(),
      });
    }

    if (
      !this.playerHitThisCharge
      && Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= CHARGE_HIT_DISTANCE
    ) {
      this.playerHitThisCharge = true;
      this.scene.events.emit('guardian-attack', this.x, this.y, 2);
    }
  }

}

const createMoonStagTexture = (scene: Phaser.Scene): void => {
  if (scene.textures.exists(MOON_STAG_TEXTURE)) return;

  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x07130f, 0.28);
  graphics.fillEllipse(70, 110, 95, 25);
  graphics.fillStyle(0xe9e0c9);
  graphics.fillEllipse(70, 72, 70, 88);
  graphics.fillCircle(70, 38, 29);
  graphics.lineStyle(8, 0xd5ad55);
  graphics.lineBetween(57, 23, 40, 2);
  graphics.lineBetween(83, 23, 100, 2);
  graphics.lineBetween(48, 14, 31, 12);
  graphics.lineBetween(92, 14, 109, 12);
  graphics.fillStyle(0x68c8b1);
  graphics.fillCircle(60, 36, 5);
  graphics.fillCircle(80, 36, 5);
  graphics.fillStyle(0x58446c);
  graphics.fillCircle(70, 68, 8);
  graphics.generateTexture(MOON_STAG_TEXTURE, 140, 140);
  graphics.destroy();
};
