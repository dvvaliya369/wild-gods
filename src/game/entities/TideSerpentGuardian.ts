import Phaser from 'phaser';
import { configureCircleBody } from '../physics/configureCircleBody';
import { Player } from './Player';

const TIDE_SERPENT_TEXTURE = 'tide-serpent-placeholder';
const DREAMLAYER_TIDE_SERPENT_TEXTURE = 'tide-serpent';
const DIVE_WINDUP = 900;
const FLOOD_DURATION = 720;
const RECOVERY_DURATION = 1050;
const FLOOD_RADIUS = 175;

type SerpentState = 'idle' | 'diving' | 'flooding' | 'recovering' | 'purified';

export class TideSerpentGuardian extends Phaser.Physics.Arcade.Sprite {
  private serpentState: SerpentState = 'idle';
  private attackTarget?: Phaser.Math.Vector2;
  private readonly floodCenter = new Phaser.Math.Vector2();
  private stateEndsAt = 0;
  private playerHitThisFlood = false;
  private warningPool?: Phaser.GameObjects.Arc;
  private floodEffect?: Phaser.GameObjects.Arc;
  private readonly visualScale: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    createTideSerpentTexture(scene);
    const texture = scene.textures.exists(DREAMLAYER_TIDE_SERPENT_TEXTURE)
      ? DREAMLAYER_TIDE_SERPENT_TEXTURE
      : TIDE_SERPENT_TEXTURE;
    super(scene, x, y, texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setDepth(45);

    if (texture === DREAMLAYER_TIDE_SERPENT_TEXTURE) {
      this.setDisplaySize(220, 220);
    }
    this.visualScale = this.scaleX;

    configureCircleBody(this, 39);
  }

  update(time: number, player: Player): void {
    if (this.serpentState === 'purified') {
      this.setVelocity(0);
      return;
    }

    if (this.serpentState === 'recovering') {
      this.setVelocity(0);
      if (time >= this.stateEndsAt) {
        this.clearTint();
        this.serpentState = 'idle';
        if (this.attackTarget) {
          const target = this.attackTarget.clone();
          this.attackTarget = undefined;
          this.startDive(time, target.x, target.y);
        }
      }
      return;
    }

    if (this.serpentState === 'diving') {
      this.setVelocity(0);
      if (time >= this.stateEndsAt) this.beginFlood(time);
      return;
    }

    if (this.serpentState === 'flooding') {
      this.setVelocity(0);
      if (!this.playerHitThisFlood && this.containsFlood(player.x, player.y)) {
        this.playerHitThisFlood = true;
        this.scene.events.emit('guardian-attack', this.x, this.y, 2);
      }
      if (time >= this.stateEndsAt) this.finishFlood(time);
      return;
    }

    this.serpentState = 'idle';
    this.setVelocity(0);
  }

  triggerAnchorAttack(attackTarget: Phaser.Math.Vector2): boolean {
    if (!['idle', 'recovering'].includes(this.serpentState)) return false;

    if (this.serpentState === 'recovering') {
      this.attackTarget = attackTarget.clone();
      return true;
    }
    this.startDive(this.scene.time.now, attackTarget.x, attackTarget.y);
    return true;
  }

  isFlooding(): boolean {
    return this.serpentState === 'flooding';
  }

  shiftTimers(duration: number): void {
    this.stateEndsAt += duration;
  }

  containsFlood(x: number, y: number): boolean {
    return this.isFlooding()
      && Phaser.Math.Distance.Between(this.floodCenter.x, this.floodCenter.y, x, y) <= FLOOD_RADIUS;
  }

  onAnchorFlooded(): void {
    if (!this.isFlooding()) return;
    this.finishFlood(this.scene.time.now);
    this.scene.cameras.main.shake(200, 0.009);
    this.scene.events.emit('tide-serpent-recovering');
  }

  purify(silent = false): void {
    if (this.serpentState === 'purified') return;

    this.serpentState = 'purified';
    this.setVelocity(0);
    this.warningPool?.destroy();
    this.floodEffect?.destroy();
    this.warningPool = undefined;
    this.floodEffect = undefined;
    this.clearTint();
    this.setTint(0x8fdbea);

    if (silent) return;

    const pulse = this.scene.add
      .circle(this.x, this.y, 48, 0x8fdbea, 0.3)
      .setStrokeStyle(6, 0xe8fbff, 0.85)
      .setDepth(40);
    this.scene.tweens.add({
      targets: pulse,
      radius: 320,
      alpha: 0,
      duration: 900,
      onComplete: () => pulse.destroy(),
    });
    this.scene.events.emit('tide-serpent-purified');
  }

  private startDive(time: number, targetX: number, targetY: number): void {
    this.serpentState = 'diving';
    this.stateEndsAt = time + DIVE_WINDUP;
    this.floodCenter.set(targetX, targetY);
    this.setVelocity(0);
    this.setTint(0x78b9cb);

    this.warningPool?.destroy();
    this.warningPool = this.scene.add
      .circle(targetX, targetY, FLOOD_RADIUS, 0x347888, 0.14)
      .setStrokeStyle(5, 0x8fdbea, 0.9)
      .setDepth(32);
    this.scene.tweens.add({
      targets: this.warningPool,
      alpha: 0.4,
      scale: 0.82,
      yoyo: true,
      repeat: 2,
      duration: DIVE_WINDUP / 6,
    });
    this.scene.tweens.add({
      targets: this,
      alpha: 0.22,
      scaleX: this.visualScale * 0.78,
      scaleY: this.visualScale * 0.78,
      duration: DIVE_WINDUP * 0.75,
      ease: 'Quad.easeIn',
    });
  }

  private beginFlood(time: number): void {
    this.warningPool?.destroy();
    this.warningPool = undefined;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.reset(this.floodCenter.x, this.floodCenter.y);
    this.setAlpha(1).setScale(this.visualScale).setTint(0xa4e8f1);
    this.serpentState = 'flooding';
    this.stateEndsAt = time + FLOOD_DURATION;
    this.playerHitThisFlood = false;

    this.floodEffect?.destroy();
    this.floodEffect = this.scene.add
      .circle(this.floodCenter.x, this.floodCenter.y, 28, 0x49a3b2, 0.34)
      .setStrokeStyle(7, 0xa9eff7, 0.9)
      .setDepth(33);
    this.scene.tweens.add({
      targets: this.floodEffect,
      radius: FLOOD_RADIUS,
      alpha: 0.16,
      duration: 280,
      ease: 'Quad.easeOut',
    });
    this.scene.cameras.main.shake(130, 0.005);
  }

  private finishFlood(time: number): void {
    this.floodEffect?.destroy();
    this.floodEffect = undefined;
    this.serpentState = 'recovering';
    this.stateEndsAt = time + RECOVERY_DURATION;
    this.setTint(0x627f87);
    this.setVelocity(0);
  }

}

const createTideSerpentTexture = (scene: Phaser.Scene): void => {
  if (scene.textures.exists(TIDE_SERPENT_TEXTURE)) return;

  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x07131a, 0.3);
  graphics.fillEllipse(70, 108, 100, 24);
  graphics.lineStyle(34, 0x397b88);
  graphics.beginPath();
  graphics.moveTo(35, 96);
  graphics.lineTo(55, 70);
  graphics.lineTo(43, 45);
  graphics.lineTo(71, 30);
  graphics.strokePath();
  graphics.fillStyle(0x4f9eaa);
  graphics.fillCircle(82, 31, 29);
  graphics.fillStyle(0x9ee5eb);
  graphics.fillCircle(74, 28, 5);
  graphics.fillCircle(91, 28, 5);
  graphics.fillStyle(0xd3f4ed);
  graphics.fillTriangle(101, 34, 122, 40, 99, 44);
  graphics.generateTexture(TIDE_SERPENT_TEXTURE, 140, 140);
  graphics.destroy();
};
