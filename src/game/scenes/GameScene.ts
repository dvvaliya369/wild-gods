import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS, WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import { AimReticle } from '../entities/AimReticle';
import { MagicalLure } from '../entities/MagicalLure';
import { Player } from '../entities/Player';
import { createWorld, type Shrine } from '../world/createWorld';

const LURE_THROW_DISTANCE = 460;
const LURE_COOLDOWN = 1200;
const INTERACTION_DISTANCE = 92;

export class GameScene extends Phaser.Scene {
  private player?: Player;
  private reticle?: AimReticle;
  private lureKey?: Phaser.Input.Keyboard.Key;
  private interactKey?: Phaser.Input.Keyboard.Key;
  private activeLure?: MagicalLure;
  private interactionText?: Phaser.GameObjects.Text;
  private shrines: Shrine[] = [];
  private nextLureAt = 0;

  constructor() {
    super(SCENE_KEYS.game);
  }

  create(): void {
    const world = createWorld(this);
    this.shrines = world.shrines;
    this.player = new Player(this, world.playerStart.x, world.playerStart.y);
    this.reticle = new AimReticle(this, world.playerStart.x, world.playerStart.y - 120);
    this.physics.add.collider(this.player, world.obstacles);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(180, 120);
    this.cameras.main.setFollowOffset(0, 35);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown);
    this.lureKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.interactKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown);
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
    if (!this.player || !this.reticle) return;

    this.reticle.update(this.input.activePointer, this.cameras.main);
    this.player.update(time, this.reticle.x, this.reticle.y);

    if (this.lureKey && Phaser.Input.Keyboard.JustDown(this.lureKey)) {
      this.throwLure();
    }

    this.updateShrineInteraction();
  }

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!pointer.leftButtonDown() || !this.player || !this.reticle) return;
    this.player.attack(this.reticle.x, this.reticle.y);
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
