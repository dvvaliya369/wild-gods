import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS, WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import { AimReticle } from '../entities/AimReticle';
import { MagicalLure } from '../entities/MagicalLure';
import { MoonStagGuardian } from '../entities/MoonStagGuardian';
import { Player, PLAYER_MAX_HEALTH } from '../entities/Player';
import { ShadowEnemy } from '../entities/ShadowEnemy';
import { createWorld, type CorruptionAnchor, type Shrine } from '../world/createWorld';

const LURE_THROW_DISTANCE = 460;
const LURE_COOLDOWN = 1200;
const INTERACTION_DISTANCE = 92;
const SHADOW_SPAWNS = [
  [1510, 980],
  [1450, 1450],
  [2160, 1110],
  [1190, 1460],
  [2440, 900],
  [2470, 1370],
  [2860, 1060],
  [2730, 1830],
] as const;

export class GameScene extends Phaser.Scene {
  private player?: Player;
  private reticle?: AimReticle;
  private lureKey?: Phaser.Input.Keyboard.Key;
  private interactKey?: Phaser.Input.Keyboard.Key;
  private restartKey?: Phaser.Input.Keyboard.Key;
  private activeLure?: MagicalLure;
  private interactionText?: Phaser.GameObjects.Text;
  private healthText?: Phaser.GameObjects.Text;
  private enemyText?: Phaser.GameObjects.Text;
  private guardianText?: Phaser.GameObjects.Text;
  private shrines: Shrine[] = [];
  private enemies: ShadowEnemy[] = [];
  private moonStag?: MoonStagGuardian;
  private moonStagAnchors: CorruptionAnchor[] = [];
  private nextLureAt = 0;
  private gameOver = false;

  constructor() {
    super(SCENE_KEYS.game);
  }

  create(): void {
    this.physics.resume();
    this.gameOver = false;
    this.nextLureAt = 0;
    this.activeLure = undefined;
    this.enemies = [];
    this.moonStag = undefined;
    this.moonStagAnchors = [];

    const world = createWorld(this);
    this.shrines = world.shrines;
    this.player = new Player(this, world.playerStart.x, world.playerStart.y);
    this.reticle = new AimReticle(this, world.playerStart.x, world.playerStart.y - 120);
    this.physics.add.collider(this.player, world.obstacles);
    this.enemies = SHADOW_SPAWNS.map(([x, y]) => new ShadowEnemy(this, x, y));
    this.enemies.forEach((enemy) => this.physics.add.collider(enemy, world.obstacles));
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(this.player, this.enemies);

    const moonStagSpawn = world.guardianSpawns.find((spawn) => spawn.id === 'moon-stag');
    if (moonStagSpawn) {
      this.moonStag = new MoonStagGuardian(
        this,
        moonStagSpawn.position.x,
        moonStagSpawn.position.y,
      );
    }
    this.moonStagAnchors = world.corruptionAnchors.filter(
      (anchor) => anchor.guardianId === 'moon-stag',
    );

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(180, 120);
    this.cameras.main.setFollowOffset(0, 35);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown);
    this.lureKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.interactKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.restartKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.events.on('player-spear-attack', this.handleSpearAttack);
    this.events.on('shadow-enemy-attack', this.handleEnemyAttack);
    this.events.on('shadow-enemy-defeated', this.handleEnemyDefeated);
    this.events.on('player-health-changed', this.handleHealthChanged);
    this.events.on('player-defeated', this.handlePlayerDefeated);
    this.events.on('lure-landed', this.handleLureLanded);
    this.events.on('guardian-attack', this.handleEnemyAttack);
    this.events.on('moon-stag-purified', this.handleMoonStagPurified);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown);
      this.events.off('player-spear-attack', this.handleSpearAttack);
      this.events.off('shadow-enemy-attack', this.handleEnemyAttack);
      this.events.off('shadow-enemy-defeated', this.handleEnemyDefeated);
      this.events.off('player-health-changed', this.handleHealthChanged);
      this.events.off('player-defeated', this.handlePlayerDefeated);
      this.events.off('lure-landed', this.handleLureLanded);
      this.events.off('guardian-attack', this.handleEnemyAttack);
      this.events.off('moon-stag-purified', this.handleMoonStagPurified);
    });

    this.add
      .text(24, 22, 'WILD GODS  /  WORLD BLOCKOUT', {
        backgroundColor: '#07130fd9',
        color: '#f3ead0',
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        padding: { x: 14, y: 10 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.interactionText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 60, 'Press E to awaken shrine', {
        backgroundColor: '#07130fe6',
        color: '#f3ead0',
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        fontStyle: 'bold',
        padding: { x: 16, y: 10 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);

    this.healthText = this.add
      .text(GAME_WIDTH - 24, 22, `HEALTH  ${PLAYER_MAX_HEALTH}/${PLAYER_MAX_HEALTH}`, {
        backgroundColor: '#07130fd9',
        color: '#e886a9',
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        fontStyle: 'bold',
        padding: { x: 12, y: 9 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    this.enemyText = this.add
      .text(GAME_WIDTH - 24, 70, `SHADOWS  ${this.enemies.length}`, {
        backgroundColor: '#07130fbd',
        color: '#c99bec',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        padding: { x: 10, y: 7 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    this.guardianText = this.add
      .text(GAME_WIDTH - 24, 110, 'MOON STAG  0/3 ANCHORS', {
        backgroundColor: '#07130fbd',
        color: '#d5ad55',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        padding: { x: 10, y: 7 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    this.add
      .text(24, 72, 'Move: WASD/arrows  |  Dodge: Space  |  Lure: Q  |  Spear: click', {
        backgroundColor: '#07130fbd',
        color: '#9ebfa8',
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        padding: { x: 12, y: 8 },
      })
      .setScrollFactor(0)
      .setDepth(100);
  }

  update(time: number): void {
    if (this.gameOver) {
      if (this.restartKey && Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.scene.restart();
      }
      return;
    }

    if (!this.player || !this.reticle) return;

    this.reticle.update(this.input.activePointer, this.cameras.main);
    this.player.update(time, this.reticle.x, this.reticle.y);
    this.enemies.forEach((enemy) => {
      if (enemy.active) enemy.update(time, this.player!);
    });
    this.moonStag?.update(time, this.player);
    this.checkMoonStagAnchorCollision();

    if (this.lureKey && Phaser.Input.Keyboard.JustDown(this.lureKey)) {
      this.throwLure();
    }

    this.updateShrineInteraction();
  }

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (this.gameOver || !pointer.leftButtonDown() || !this.player || !this.reticle) return;
    this.player.attack(this.reticle.x, this.reticle.y);
  };

  private readonly handleSpearAttack = (hitArea: Phaser.Geom.Circle): void => {
    if (!this.player) return;

    this.enemies.forEach((enemy) => {
      if (enemy.active && hitArea.contains(enemy.x, enemy.y)) {
        enemy.takeDamage(1, this.player!.x, this.player!.y);
      }
    });
  };

  private readonly handleEnemyAttack = (x: number, y: number, damage: number): void => {
    this.player?.takeDamage(damage, x, y);
  };

  private readonly handleLureLanded = (
    lure: MagicalLure,
    attractionArea: Phaser.Geom.Circle,
  ): void => {
    this.moonStag?.reactToLure(lure, attractionArea);
  };

  private readonly checkMoonStagAnchorCollision = (): void => {
    if (!this.moonStag?.isCharging()) return;

    const hitAnchor = this.moonStagAnchors.find((anchor) => (
      !anchor.destroyed
      && Phaser.Math.Distance.Between(
        this.moonStag!.x,
        this.moonStag!.y,
        anchor.position.x,
        anchor.position.y,
      ) <= 76
    ));
    if (!hitAnchor) return;

    hitAnchor.destroyed = true;
    const body = hitAnchor.obstacle.body as Phaser.Physics.Arcade.StaticBody;
    body.enable = false;
    this.tweens.add({
      targets: hitAnchor.marker,
      alpha: 0,
      scale: 2,
      angle: 90,
      duration: 300,
      onComplete: () => hitAnchor.marker.destroy(),
    });
    this.moonStag.onAnchorHit();

    const destroyed = this.moonStagAnchors.filter((anchor) => anchor.destroyed).length;
    this.guardianText?.setText(`MOON STAG  ${destroyed}/3 ANCHORS`);
    if (destroyed === this.moonStagAnchors.length) {
      this.moonStag.purify();
    }
  };

  private readonly handleMoonStagPurified = (): void => {
    this.guardianText?.setText('MOON STAG  PURIFIED').setColor('#8fe0c5');
    const message = this.add
      .text(GAME_WIDTH / 2, 130, 'MOON STAG RESTORED', {
        backgroundColor: '#07130fe6',
        color: '#8fe0c5',
        fontFamily: 'Georgia, serif',
        fontSize: '26px',
        fontStyle: 'bold',
        padding: { x: 20, y: 12 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(400);
    this.tweens.add({
      targets: message,
      alpha: 0,
      delay: 1700,
      duration: 500,
      onComplete: () => message.destroy(),
    });
  };

  private readonly handleHealthChanged = (health: number, maximum: number): void => {
    this.healthText?.setText(`HEALTH  ${health}/${maximum}`);
  };

  private readonly handleEnemyDefeated = (): void => {
    const remaining = this.enemies.filter((enemy) => enemy.active).length - 1;
    this.enemyText?.setText(`SHADOWS  ${Math.max(0, remaining)}`);
  };

  private readonly handlePlayerDefeated = (): void => {
    this.gameOver = true;
    this.physics.pause();
    this.reticle?.setVisible(false);

    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 560, 250, 0x07130f, 0.95)
      .setStrokeStyle(4, 0x8158a7)
      .setScrollFactor(0)
      .setDepth(500);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, [
        'THE WILDERNESS CLAIMED YOU',
        '',
        'Press R to return to the sanctuary',
      ], {
        align: 'center',
        color: '#f3ead0',
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        lineSpacing: 10,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(501);
  };

  private readonly throwLure = (): void => {
    if (!this.player || !this.reticle || this.time.now < this.nextLureAt) return;

    const direction = new Phaser.Math.Vector2(
      this.reticle.x - this.player.x,
      this.reticle.y - this.player.y,
    );
    const distance = Math.min(direction.length(), LURE_THROW_DISTANCE);
    if (distance < 24) return;

    direction.normalize().scale(distance);
    const targetX = Phaser.Math.Clamp(this.player.x + direction.x, 30, WORLD_WIDTH - 30);
    const targetY = Phaser.Math.Clamp(this.player.y + direction.y, 30, WORLD_HEIGHT - 30);

    if (this.activeLure?.active) this.activeLure.destroy();
    this.activeLure = new MagicalLure(this, this.player.x, this.player.y, targetX, targetY);
    this.nextLureAt = this.time.now + LURE_COOLDOWN;
  };

  private readonly updateShrineInteraction = (): void => {
    if (!this.player || !this.interactionText) return;

    const nearbyShrine = this.shrines.find((shrine) => (
      !shrine.activated
      && Phaser.Math.Distance.Between(
        this.player!.x,
        this.player!.y,
        shrine.position.x,
        shrine.position.y,
      ) <= INTERACTION_DISTANCE
    ));

    this.interactionText.setVisible(Boolean(nearbyShrine));
    if (!nearbyShrine || !this.interactKey || !Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      return;
    }

    nearbyShrine.activated = true;
    nearbyShrine.marker.setFillStyle(0xd5ad55, 1).setStrokeStyle(6, 0xf3ead0, 1);
    this.interactionText.setVisible(false);
    this.cameras.main.flash(180, 213, 173, 85, false);
    this.events.emit('shrine-activated', nearbyShrine.id, nearbyShrine.region);
  };
}
