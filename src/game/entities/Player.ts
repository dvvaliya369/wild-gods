import Phaser from 'phaser';

const PLAYER_TEXTURE = 'player-placeholder';
const MOVE_SPEED = 270;
const SPEAR_REACH = 94;
const SPEAR_RADIUS = 38;
const SPEAR_COOLDOWN = 280;
const DODGE_SPEED = 650;
const DODGE_DURATION = 160;
const DODGE_COOLDOWN = 720;
const HURT_DURATION = 220;
const DAMAGE_INVULNERABILITY = 700;

export const PLAYER_MAX_HEALTH = 5;

type MovementKeys = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  private readonly wasd: MovementKeys;
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly dodgeKey: Phaser.Input.Keyboard.Key;
  private readonly lastMoveDirection = new Phaser.Math.Vector2(0, -1);
  private nextAttackAt = 0;
  private nextDodgeAt = 0;
  private dodgeEndsAt = 0;
  private hurtEndsAt = 0;
  private invulnerableUntil = 0;
  private health = PLAYER_MAX_HEALTH;
  private defeated = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    createPlaceholderTexture(scene);
    super(scene, x, y, PLAYER_TEXTURE);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setDepth(50);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(18, 8, 15);

    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is unavailable');
    }

    this.wasd = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as MovementKeys;
    this.cursors = keyboard.createCursorKeys();
    this.dodgeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  update(time: number, aimX: number, aimY: number): void {
    if (this.defeated) {
      this.setVelocity(0);
      return;
    }

    const horizontal = Number(this.wasd.right.isDown || this.cursors.right.isDown)
      - Number(this.wasd.left.isDown || this.cursors.left.isDown);
    const vertical = Number(this.wasd.down.isDown || this.cursors.down.isDown)
      - Number(this.wasd.up.isDown || this.cursors.up.isDown);
    const direction = new Phaser.Math.Vector2(horizontal, vertical);

    this.setRotation(
      Phaser.Math.Angle.Between(this.x, this.y, aimX, aimY) + Math.PI / 2,
    );

    if (time < this.hurtEndsAt) {
      this.setScale(0.94, 1.06);
      return;
    }

    if (this.tintTopLeft !== 0xffffff && time >= this.invulnerableUntil) {
      this.clearTint();
      this.setAlpha(1);
    }

    if (time < this.dodgeEndsAt) {
      this.setScale(1.12, 0.88);
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.dodgeKey) && time >= this.nextDodgeAt) {
      if (direction.lengthSq() > 0) {
        this.lastMoveDirection.copy(direction.normalize());
      }
      this.startDodge(time);
      return;
    }

    if (direction.lengthSq() === 0) {
      this.setVelocity(0);
      this.setScale(1);
      return;
    }

    direction.normalize();
    this.lastMoveDirection.copy(direction);
    this.setVelocity(direction.x * MOVE_SPEED, direction.y * MOVE_SPEED);
    this.setScale(1, 1 + Math.sin(time * 0.018) * 0.04);
  }

  attack(aimX: number, aimY: number): boolean {
    if (
      this.defeated
      || this.scene.time.now < this.nextAttackAt
      || this.scene.time.now < this.dodgeEndsAt
      || this.scene.time.now < this.hurtEndsAt
    ) {
      return false;
    }

    this.nextAttackAt = this.scene.time.now + SPEAR_COOLDOWN;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, aimX, aimY);
    const hitX = this.x + Math.cos(angle) * SPEAR_REACH;
    const hitY = this.y + Math.sin(angle) * SPEAR_REACH;
    const hitArea = new Phaser.Geom.Circle(hitX, hitY, SPEAR_RADIUS);
    const effect = this.scene.add.graphics().setDepth(90);

    effect.lineStyle(8, 0xd5ad55, 0.85);
    effect.lineBetween(
      this.x + Math.cos(angle) * 26,
      this.y + Math.sin(angle) * 26,
      hitX,
      hitY,
    );
    effect.lineStyle(3, 0xf3ead0, 0.75);
    effect.strokeCircle(hitX, hitY, SPEAR_RADIUS);

    this.scene.tweens.add({
      targets: effect,
      alpha: 0,
      duration: 150,
      ease: 'Quad.easeOut',
      onComplete: () => effect.destroy(),
    });

    this.scene.cameras.main.shake(60, 0.0015);
    this.scene.events.emit('player-spear-attack', hitArea, angle);
    return true;
  }

  takeDamage(amount: number, sourceX: number, sourceY: number): boolean {
    const now = this.scene.time.now;
    if (
      this.defeated
      || now < this.dodgeEndsAt
      || now < this.invulnerableUntil
    ) {
      return false;
    }

    this.health = Math.max(0, this.health - amount);
    this.hurtEndsAt = now + HURT_DURATION;
    this.invulnerableUntil = now + DAMAGE_INVULNERABILITY;
    this.setTint(0xf07864).setAlpha(0.8);

    const knockback = new Phaser.Math.Vector2(this.x - sourceX, this.y - sourceY);
    if (knockback.lengthSq() === 0) knockback.set(0, 1);
    knockback.normalize().scale(430);
    this.setVelocity(knockback.x, knockback.y);
    this.scene.cameras.main.shake(120, 0.006);
    this.scene.events.emit('player-health-changed', this.health, PLAYER_MAX_HEALTH);

    if (this.health === 0) {
      this.defeated = true;
      this.setTint(0x5d3840).setAlpha(0.65);
      this.scene.events.emit('player-defeated');
    }

    return true;
  }

  getHealth(): number {
    return this.health;
  }

  isDefeated(): boolean {
    return this.defeated;
  }

  private startDodge(time: number): void {
    this.dodgeEndsAt = time + DODGE_DURATION;
    this.nextDodgeAt = time + DODGE_COOLDOWN;
    this.setVelocity(
      this.lastMoveDirection.x * DODGE_SPEED,
      this.lastMoveDirection.y * DODGE_SPEED,
    );

    const trail = this.scene.add
      .circle(this.x, this.y, 24, 0xd5ad55, 0.3)
      .setDepth(this.depth - 1);
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      scale: 2,
      duration: 280,
      ease: 'Quad.easeOut',
      onComplete: () => trail.destroy(),
    });

    this.scene.events.emit('player-dodge-start', DODGE_DURATION);
    this.scene.time.delayedCall(DODGE_DURATION, () => {
      if (this.active) this.scene.events.emit('player-dodge-end');
    });
  }
}

const createPlaceholderTexture = (scene: Phaser.Scene): void => {
  if (scene.textures.exists(PLAYER_TEXTURE)) return;

  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x07130f, 0.36);
  graphics.fillEllipse(26, 55, 40, 13);
  graphics.fillStyle(0xe8d7aa);
  graphics.fillCircle(26, 32, 20);
  graphics.lineStyle(5, 0x263a30);
  graphics.strokeCircle(26, 32, 17);
  graphics.fillStyle(0xd5ad55);
  graphics.fillTriangle(26, 1, 17, 21, 35, 21);
  graphics.fillStyle(0x8f6147);
  graphics.fillRect(23, 0, 6, 25);
  graphics.generateTexture(PLAYER_TEXTURE, 52, 64);
  graphics.destroy();
};
