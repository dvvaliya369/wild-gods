import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../constants';
import { AimReticle } from '../entities/AimReticle';
import { EmberBoarGuardian } from '../entities/EmberBoarGuardian';
import { MoonStagGuardian } from '../entities/MoonStagGuardian';
import { Player, PLAYER_MAX_HEALTH } from '../entities/Player';
import { ShadowEnemy } from '../entities/ShadowEnemy';
import { TideSerpentGuardian } from '../entities/TideSerpentGuardian';
import { createGameAudio, type GameAudio } from '../services/gameAudio';
import {
  loadGameSave,
  saveGame,
  type GameSave,
  type GuardianId,
} from '../services/gameStorage';
import { WorldMiniMap } from '../ui/WorldMiniMap';
import { TutorialGuide } from '../ui/TutorialGuide';
import { ObjectiveWaypoint } from '../ui/ObjectiveWaypoint';
import { createAmbientEffects } from '../world/createAmbientEffects';
import {
  createWorld,
  type CorruptionAnchor,
  type RegionGate,
  type Shrine,
} from '../world/createWorld';

const LURE_COOLDOWN = 400;
const GUARDIAN_TRIGGER_RANGE = 600;
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

type EntityShadow = {
  target: Phaser.Physics.Arcade.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  yOffset: number;
};

export class GameScene extends Phaser.Scene {
  private player?: Player;
  private reticle?: AimReticle;
  private lureKey?: Phaser.Input.Keyboard.Key;
  private interactKey?: Phaser.Input.Keyboard.Key;
  private restartKey?: Phaser.Input.Keyboard.Key;
  private finishKey?: Phaser.Input.Keyboard.Key;
  private pauseKey?: Phaser.Input.Keyboard.Key;
  private muteKey?: Phaser.Input.Keyboard.Key;
  private unstuckKey?: Phaser.Input.Keyboard.Key;
  private tutorialSkipKey?: Phaser.Input.Keyboard.Key;
  private interactionText?: Phaser.GameObjects.Text;
  private healthText?: Phaser.GameObjects.Text;
  private enemyText?: Phaser.GameObjects.Text;
  private guardianText?: Phaser.GameObjects.Text;
  private boarText?: Phaser.GameObjects.Text;
  private serpentText?: Phaser.GameObjects.Text;
  private muteText?: Phaser.GameObjects.Text;
  private objectiveText?: Phaser.GameObjects.Text;
  private guardianHintText?: Phaser.GameObjects.Text;
  private shrines: Shrine[] = [];
  private regionGates: RegionGate[] = [];
  private enemies: ShadowEnemy[] = [];
  private moonStag?: MoonStagGuardian;
  private moonStagAnchors: CorruptionAnchor[] = [];
  private emberBoar?: EmberBoarGuardian;
  private emberBoarAnchors: CorruptionAnchor[] = [];
  private tideSerpent?: TideSerpentGuardian;
  private tideSerpentAnchors: CorruptionAnchor[] = [];
  private pauseOverlay?: Phaser.GameObjects.Container;
  private saveData?: GameSave;
  private gameAudio?: GameAudio;
  private miniMap?: WorldMiniMap;
  private tutorial?: TutorialGuide;
  private objectiveWaypoint?: ObjectiveWaypoint;
  private regionBanner?: Phaser.GameObjects.Text;
  private readonly discoveredRegions = new Set<string>();
  private entityShadows: EntityShadow[] = [];
  private nextLureAt = 0;
  private nextGateNoticeAt = 0;
  private gameOver = false;
  private journeyFinished = false;
  private paused = false;
  private pauseStartedAt = 0;

  constructor() {
    super(SCENE_KEYS.game);
  }

  create(): void {
    this.physics.resume();
    this.gameOver = false;
    this.journeyFinished = false;
    this.paused = false;
    this.nextLureAt = 0;
    this.nextGateNoticeAt = 0;
    this.enemies = [];
    this.entityShadows = [];
    this.moonStag = undefined;
    this.moonStagAnchors = [];
    this.emberBoar = undefined;
    this.emberBoarAnchors = [];
    this.tideSerpent = undefined;
    this.tideSerpentAnchors = [];
    this.saveData = loadGameSave();
    this.gameAudio = createGameAudio(this, this.saveData.muted);
    this.discoveredRegions.clear();
    this.cameras.main.fadeIn(450, 7, 19, 15);

    const world = createWorld(this);
    createAmbientEffects(this);
    this.shrines = world.shrines;
    this.regionGates = world.regionGates;
    this.player = new Player(this, world.playerStart.x, world.playerStart.y);
    this.reticle = new AimReticle(this, world.playerStart.x, world.playerStart.y - 120);
    this.enemies = SHADOW_SPAWNS.map(([x, y]) => new ShadowEnemy(this, x, y));
    this.physics.add.collider(this.enemies, this.enemies);

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
    const emberBoarSpawn = world.guardianSpawns.find((spawn) => spawn.id === 'ember-boar');
    if (emberBoarSpawn) {
      this.emberBoar = new EmberBoarGuardian(
        this,
        emberBoarSpawn.position.x,
        emberBoarSpawn.position.y,
      );
    }
    this.emberBoarAnchors = world.corruptionAnchors.filter(
      (anchor) => anchor.guardianId === 'ember-boar',
    );
    const tideSerpentSpawn = world.guardianSpawns.find((spawn) => spawn.id === 'tide-serpent');
    if (tideSerpentSpawn) {
      this.tideSerpent = new TideSerpentGuardian(
        this,
        tideSerpentSpawn.position.x,
        tideSerpentSpawn.position.y,
      );
    }
    this.tideSerpentAnchors = world.corruptionAnchors.filter(
      (anchor) => anchor.guardianId === 'tide-serpent',
    );
    this.miniMap = new WorldMiniMap(this, world.guardianSpawns, world.shrines);
    this.objectiveWaypoint = new ObjectiveWaypoint(this);
    this.addEntityShadow(this.player!, 44, 15, 25);
    this.enemies.forEach((enemy) => this.addEntityShadow(enemy, 48, 17, 23));
    if (this.moonStag) this.addEntityShadow(this.moonStag, 112, 34, 42);
    if (this.emberBoar) this.addEntityShadow(this.emberBoar, 128, 40, 46);
    if (this.tideSerpent) this.addEntityShadow(this.tideSerpent, 135, 36, 44);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(180, 120);
    this.cameras.main.setFollowOffset(0, 35);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown);
    this.lureKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.interactKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.restartKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.finishKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.pauseKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.muteKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.unstuckKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.U);
    this.tutorialSkipKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    this.events.on('player-spear-attack', this.handleSpearAttack);
    this.events.on('shadow-enemy-defeated', this.handleEnemyDefeated);
    this.events.on('player-health-changed', this.handleHealthChanged);
    this.events.on('player-defeated', this.handlePlayerDefeated);
    this.events.on('moon-stag-purified', this.handleMoonStagPurified);
    this.events.on('ember-boar-purified', this.handleEmberBoarPurified);
    this.events.on('tide-serpent-purified', this.handleTideSerpentPurified);
    this.events.on('player-unstuck', this.handlePlayerUnstuck);
    this.events.on('player-dodge-start', this.handlePlayerDodge);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.handleGameHidden);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown);
      this.events.off('player-spear-attack', this.handleSpearAttack);
      this.events.off('shadow-enemy-defeated', this.handleEnemyDefeated);
      this.events.off('player-health-changed', this.handleHealthChanged);
      this.events.off('player-defeated', this.handlePlayerDefeated);
      this.events.off('moon-stag-purified', this.handleMoonStagPurified);
      this.events.off('ember-boar-purified', this.handleEmberBoarPurified);
      this.events.off('tide-serpent-purified', this.handleTideSerpentPurified);
      this.events.off('player-unstuck', this.handlePlayerUnstuck);
      this.events.off('player-dodge-start', this.handlePlayerDodge);
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.handleGameHidden);
      this.gameAudio?.destroy();
    });

    this.add
      .text(24, 22, 'WILD GODS  /  SHATTERED SANCTUARY', {
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
      .text(GAME_WIDTH - 24, 70, `OPTIONAL SHADOWS  ${this.enemies.length}`, {
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

    this.boarText = this.add
      .text(GAME_WIDTH - 24, 150, 'EMBER BOAR  0/3 ANCHORS', {
        backgroundColor: '#07130fbd',
        color: '#e89a52',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        padding: { x: 10, y: 7 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    this.serpentText = this.add
      .text(GAME_WIDTH - 24, 190, 'TIDE SERPENT  0/3 ANCHORS', {
        backgroundColor: '#07130fbd',
        color: '#8fdbea',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        padding: { x: 10, y: 7 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    this.muteText = this.add
      .text(GAME_WIDTH - 24, 230, this.saveData.muted ? 'AUDIO  MUTED [M]' : 'AUDIO  ON [M]', {
        backgroundColor: '#07130fbd',
        color: '#9ebfa8',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        padding: { x: 9, y: 6 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    this.objectiveText = this.add
      .text(24, 112, '', {
        backgroundColor: '#07130fbd',
        color: '#d9e4dc',
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        padding: { x: 11, y: 7 },
        wordWrap: { width: 440 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.guardianHintText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 145, '', {
        backgroundColor: '#07130fe3',
        color: '#f3ead0',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(300)
      .setVisible(false);

    const pauseShade = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050b08, 0.78)
      .setScrollFactor(0);
    const pausePanel = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 500, 230, 0x10271c, 0.98)
      .setStrokeStyle(4, 0xd5ad55)
      .setScrollFactor(0);
    const pauseTitle = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 45, 'JOURNEY PAUSED', {
        color: '#f3ead0',
        fontFamily: 'Georgia, serif',
        fontSize: '30px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    const pauseHelp = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 35, 'Press Esc to continue', {
        color: '#9ebfa8',
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.pauseOverlay = this.add
      .container(0, 0, [pauseShade, pausePanel, pauseTitle, pauseHelp])
      .setDepth(700)
      .setVisible(false);

    this.add
      .text(24, 72, 'WASD Move  |  Space Dodge  |  Q Lure  |  Click Spear  |  U Unstuck', {
        backgroundColor: '#07130fbd',
        color: '#9ebfa8',
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        padding: { x: 12, y: 8 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    if (!this.saveData.tutorialComplete) {
      this.tutorial = new TutorialGuide(
        this,
        this.player.x,
        this.player.y,
        this.completeTutorial,
      );
    }

    this.restoreSavedProgress();
  }

  update(time: number): void {
    if (this.muteKey && Phaser.Input.Keyboard.JustDown(this.muteKey)) {
      this.toggleAudio();
    }

    if (
      this.pauseKey
      && Phaser.Input.Keyboard.JustDown(this.pauseKey)
      && !this.gameOver
      && !this.journeyFinished
    ) {
      this.togglePause();
    }

    if (this.paused) return;

    if (this.tutorialSkipKey && Phaser.Input.Keyboard.JustDown(this.tutorialSkipKey)) {
      this.tutorial?.skip();
    }

    if (this.journeyFinished) {
      if (this.finishKey && Phaser.Input.Keyboard.JustDown(this.finishKey)) {
        this.cameras.main.fadeOut(420, 7, 19, 15);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.start(SCENE_KEYS.title);
        });
      }
      return;
    }

    if (this.gameOver) {
      if (this.restartKey && Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.scene.restart();
      }
      return;
    }

    if (!this.player || !this.reticle) return;

    this.reticle.update(this.input.activePointer, this.cameras.main);
    this.player.update(time, this.reticle.x, this.reticle.y);
    this.enforceRegionGates();
    if (this.unstuckKey && Phaser.Input.Keyboard.JustDown(this.unstuckKey)) {
      this.player.recoverToSafePosition();
    }
    this.miniMap?.updatePlayer(this.player.x, this.player.y);
    this.updateObjectiveWaypoint();
    if (this.moonStag) this.miniMap?.updateGuardian('moon-stag', this.moonStag.x, this.moonStag.y);
    if (this.emberBoar) this.miniMap?.updateGuardian('ember-boar', this.emberBoar.x, this.emberBoar.y);
    if (this.tideSerpent) {
      this.miniMap?.updateGuardian('tide-serpent', this.tideSerpent.x, this.tideSerpent.y);
    }
    this.tutorial?.updatePlayerPosition(this.player.x, this.player.y);
    this.updateRegionDiscovery();
    this.updateGuardianHint();
    this.enemies.forEach((enemy) => {
      if (enemy.active) enemy.update(time, this.player!);
    });
    this.updateEntityShadows();

    if (this.lureKey && Phaser.Input.Keyboard.JustDown(this.lureKey)) {
      this.triggerCurrentGuardian();
    }

    this.updateShrineInteraction();
  }

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (
      this.paused
      || this.journeyFinished
      || this.gameOver
      || !pointer.leftButtonDown()
      || !this.player
      || !this.reticle
    ) return;
    this.player.attack(this.reticle.x, this.reticle.y);
  };

  private readonly handleSpearAttack = (hitArea: Phaser.Geom.Circle): void => {
    if (!this.player) return;

    this.tutorial?.recordAttack();

    this.enemies.forEach((enemy) => {
      if (enemy.active && hitArea.contains(enemy.x, enemy.y)) {
        enemy.takeDamage(1, this.player!.x, this.player!.y);
      }
    });
  };

  private readonly findNearestAnchor = (
    anchors: CorruptionAnchor[],
    guardian?: Phaser.Physics.Arcade.Sprite,
  ): CorruptionAnchor | undefined => {
    if (!guardian) return undefined;

    return anchors
      .filter((anchor) => !anchor.destroyed)
      .sort((left, right) => (
        Phaser.Math.Distance.Squared(guardian.x, guardian.y, left.position.x, left.position.y)
        - Phaser.Math.Distance.Squared(guardian.x, guardian.y, right.position.x, right.position.y)
      ))[0];
  };

  private readonly destroyAnchor = (anchor: CorruptionAnchor): void => {
    if (anchor.destroyed) return;

    anchor.destroyed = true;
    const body = anchor.obstacle.body as Phaser.Physics.Arcade.StaticBody;
    body.enable = false;
    this.tweens.add({
      targets: anchor.marker,
      alpha: 0,
      scale: 2,
      angle: 90,
      duration: 300,
      onComplete: () => anchor.marker.destroy(),
    });
    if (this.saveData && !this.saveData.destroyedAnchors.includes(anchor.id)) {
      this.saveData.destroyedAnchors.push(anchor.id);
      saveGame(this.saveData);
    }
    this.events.emit('anchor-destroyed', anchor.guardianId, anchor.id);
  };

  private readonly handleMoonStagPurified = (): void => {
    this.recordGuardianPurified('moon-stag');
    this.openRegionGate('moon-stag');
    this.miniMap?.setGuardianPurified('moon-stag');
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

  private readonly handleEmberBoarPurified = (): void => {
    this.recordGuardianPurified('ember-boar');
    this.openRegionGate('ember-boar');
    this.miniMap?.setGuardianPurified('ember-boar');
    this.boarText?.setText('EMBER BOAR  PURIFIED').setColor('#f3c76b');
    const message = this.add
      .text(GAME_WIDTH / 2, 175, 'EMBER BOAR RESTORED', {
        backgroundColor: '#07130fe6',
        color: '#f3c76b',
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

  private readonly handleTideSerpentPurified = (): void => {
    this.recordGuardianPurified('tide-serpent');
    this.miniMap?.setGuardianPurified('tide-serpent');
    this.serpentText?.setText('TIDE SERPENT  PURIFIED').setColor('#a9eff7');
    const message = this.add
      .text(GAME_WIDTH / 2, 220, 'TIDE SERPENT RESTORED', {
        backgroundColor: '#07130fe6',
        color: '#a9eff7',
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

  private readonly handlePlayerUnstuck = (): void => {
    const message = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 110, 'Returned to safe ground', {
        backgroundColor: '#07130fdd',
        color: '#f3ead0',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        padding: { x: 12, y: 7 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(250);
    this.tweens.add({
      targets: message,
      alpha: 0,
      delay: 600,
      duration: 350,
      onComplete: () => message.destroy(),
    });
  };

  private readonly handlePlayerDodge = (): void => {
    this.tutorial?.recordDodge();
  };

  private readonly handleEnemyDefeated = (): void => {
    const remaining = this.enemies.filter((enemy) => enemy.active).length - 1;
    this.enemyText?.setText(`OPTIONAL SHADOWS  ${Math.max(0, remaining)}`);
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

  private readonly triggerCurrentGuardian = (): void => {
    if (!this.player || !this.saveData) return;

    let guardian: MoonStagGuardian | EmberBoarGuardian | TideSerpentGuardian | undefined;
    let anchors: CorruptionAnchor[] = [];
    let guardianName = '';

    if (!this.saveData.guardians['moon-stag']) {
      guardian = this.moonStag;
      anchors = this.moonStagAnchors;
      guardianName = 'Moon Stag';
    } else if (!this.saveData.guardians['ember-boar']) {
      guardian = this.emberBoar;
      anchors = this.emberBoarAnchors;
      guardianName = 'Ember Boar';
    } else if (!this.saveData.guardians['tide-serpent']) {
      guardian = this.tideSerpent;
      anchors = this.tideSerpentAnchors;
      guardianName = 'Tide Serpent';
    }

    if (!guardian) return;
    if (this.time.now < this.nextLureAt) {
      this.showActionMessage('Guardian power is recharging...', '#9ebfa8');
      return;
    }
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, guardian.x, guardian.y);
    if (distance > GUARDIAN_TRIGGER_RANGE) {
      this.showActionMessage(`Move closer to ${guardianName} before pressing Q.`, '#f3c76b');
      return;
    }

    const anchor = this.findNearestAnchor(anchors, guardian);
    if (!anchor) return;

    this.nextLureAt = this.time.now + LURE_COOLDOWN;
    this.tutorial?.recordLure();
    this.events.emit('lure-activated');
    this.destroyAnchor(anchor);
    const beam = this.add.graphics().setDepth(85);
    beam.lineStyle(14, 0xd5ad55, 0.18);
    beam.lineBetween(guardian.x, guardian.y, anchor.position.x, anchor.position.y);
    beam.lineStyle(4, 0xf3ead0, 0.85);
    beam.lineBetween(guardian.x, guardian.y, anchor.position.x, anchor.position.y);
    this.tweens.add({
      targets: beam,
      alpha: 0,
      duration: 360,
      onComplete: () => beam.destroy(),
    });
    const pulse = this.add
      .circle(anchor.position.x, anchor.position.y, 28, 0xd5ad55, 0.28)
      .setStrokeStyle(4, 0xf3ead0, 0.8)
      .setDepth(80);
    this.tweens.add({
      targets: pulse,
      radius: 130,
      alpha: 0,
      duration: 420,
      onComplete: () => pulse.destroy(),
    });
    guardian.setTint(0xf3d98b);
    this.cameras.main.shake(130, 0.006);

    const destroyed = anchors.filter((item) => item.destroyed).length;
    if (guardian === this.moonStag) {
      this.guardianText?.setText(`MOON STAG  ${destroyed}/3 ANCHORS`);
      if (destroyed === anchors.length) this.moonStag.purify();
    } else if (guardian === this.emberBoar) {
      this.boarText?.setText(`EMBER BOAR  ${destroyed}/3 ANCHORS`);
      if (destroyed === anchors.length) this.emberBoar.purify();
    } else if (guardian === this.tideSerpent) {
      this.serpentText?.setText(`TIDE SERPENT  ${destroyed}/3 ANCHORS`);
      if (destroyed === anchors.length) this.tideSerpent.purify();
    }

    if (destroyed < anchors.length) {
      this.time.delayedCall(220, () => {
        if (guardian.active) guardian.clearTint();
      });
    }
    this.showActionMessage(`${guardianName}: anchor ${destroyed}/3 destroyed.`, '#8fe0c5');
  };

  private readonly showActionMessage = (text: string, color: string): void => {
    const message = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 112, text, {
        backgroundColor: '#07130fea',
        color,
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(520);
    this.tweens.add({
      targets: message,
      alpha: 0,
      delay: 700,
      duration: 350,
      onComplete: () => message.destroy(),
    });
  };

  private readonly updateShrineInteraction = (): void => {
    if (!this.player || !this.interactionText) return;

    const centralShrine = this.shrines.find((shrine) => shrine.id === 'central-sanctuary');
    const allPurified = this.saveData
      ? Object.values(this.saveData.guardians).every(Boolean)
      : false;
    const canCompleteJourney = Boolean(
      allPurified
      && !this.saveData?.completed
      && centralShrine
      && Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        centralShrine.position.x,
        centralShrine.position.y,
      ) <= INTERACTION_DISTANCE,
    );

    if (canCompleteJourney) {
      this.interactionText.setText('Press E to restore the Shattered Sanctuary').setVisible(true);
      if (this.interactKey && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this.completeJourney();
      }
      return;
    }

    const nearbyShrine = this.shrines.find((shrine) => (
      !shrine.activated
      && Phaser.Math.Distance.Between(
        this.player!.x,
        this.player!.y,
        shrine.position.x,
        shrine.position.y,
      ) <= INTERACTION_DISTANCE
    ));

    this.interactionText.setText('Press E to awaken shrine').setVisible(Boolean(nearbyShrine));
    if (!nearbyShrine || !this.interactKey || !Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      return;
    }

    nearbyShrine.activated = true;
    nearbyShrine.marker.setFillStyle(0xd5ad55, 1).setStrokeStyle(6, 0xf3ead0, 1);
    this.miniMap?.setShrineActivated(nearbyShrine.id);
    if (this.saveData && !this.saveData.activatedShrines.includes(nearbyShrine.id)) {
      this.saveData.activatedShrines.push(nearbyShrine.id);
      saveGame(this.saveData);
    }
    this.interactionText.setVisible(false);
    this.cameras.main.flash(180, 213, 173, 85, false);
    this.events.emit('shrine-activated', nearbyShrine.id, nearbyShrine.region);
  };

  private readonly restoreSavedProgress = (): void => {
    if (!this.saveData) return;

    this.shrines.forEach((shrine) => {
      if (!this.saveData!.activatedShrines.includes(shrine.id)) return;
      shrine.activated = true;
      shrine.marker.setFillStyle(0xd5ad55, 1).setStrokeStyle(6, 0xf3ead0, 1);
      this.miniMap?.setShrineActivated(shrine.id);
    });

    const allAnchors = [
      ...this.moonStagAnchors,
      ...this.emberBoarAnchors,
      ...this.tideSerpentAnchors,
    ];
    allAnchors.forEach((anchor) => {
      if (this.saveData!.destroyedAnchors.includes(anchor.id)) this.restoreAnchor(anchor);
    });

    this.guardianText?.setText(
      `MOON STAG  ${this.moonStagAnchors.filter((anchor) => anchor.destroyed).length}/3 ANCHORS`,
    );
    this.boarText?.setText(
      `EMBER BOAR  ${this.emberBoarAnchors.filter((anchor) => anchor.destroyed).length}/3 ANCHORS`,
    );
    this.serpentText?.setText(
      `TIDE SERPENT  ${this.tideSerpentAnchors.filter((anchor) => anchor.destroyed).length}/3 ANCHORS`,
    );

    if (this.saveData.guardians['moon-stag']) {
      this.moonStagAnchors.forEach(this.restoreAnchor);
      this.moonStag?.purify(true);
      this.guardianText?.setText('MOON STAG  PURIFIED').setColor('#8fe0c5');
      this.miniMap?.setGuardianPurified('moon-stag');
      this.openRegionGate('moon-stag', true);
    }

    if (this.saveData.guardians['ember-boar']) {
      this.emberBoarAnchors.forEach(this.restoreAnchor);
      this.emberBoar?.purify(true);
      this.boarText?.setText('EMBER BOAR  PURIFIED').setColor('#f3c76b');
      this.miniMap?.setGuardianPurified('ember-boar');
      this.openRegionGate('ember-boar', true);
    }

    if (this.saveData.guardians['tide-serpent']) {
      this.tideSerpentAnchors.forEach(this.restoreAnchor);
      this.tideSerpent?.purify(true);
      this.serpentText?.setText('TIDE SERPENT  PURIFIED').setColor('#a9eff7');
      this.miniMap?.setGuardianPurified('tide-serpent');
    }
    this.updateObjectiveText();
  };

  private readonly restoreAnchor = (anchor: CorruptionAnchor): void => {
    anchor.destroyed = true;
    const body = anchor.obstacle.body as Phaser.Physics.Arcade.StaticBody;
    body.enable = false;
    anchor.marker.destroy();
  };

  private readonly openRegionGate = (guardianId: GuardianId, silent = false): void => {
    const gate = this.regionGates.find((item) => item.requiredGuardian === guardianId);
    if (!gate || gate.opened) return;

    gate.opened = true;

    if (silent) {
      gate.overlay.destroy();
      gate.label.destroy();
      return;
    }

    this.tweens.add({
      targets: [gate.overlay, gate.label],
      alpha: 0,
      duration: 650,
      onComplete: () => {
        gate.overlay.destroy();
        gate.label.destroy();
      },
    });
  };

  private readonly enforceRegionGates = (): void => {
    if (!this.player) return;

    const blockedGate = this.regionGates.find((gate) => (
      !gate.opened
      && this.player!.x > gate.boundaryX
      && this.player!.y >= gate.minimumY
      && this.player!.y < gate.maximumY
    ));
    if (!blockedGate) return;

    this.player.moveToSafePosition(blockedGate.boundaryX - 24, this.player.y);
    if (this.time.now < this.nextGateNoticeAt) return;

    this.nextGateNoticeAt = this.time.now + 1400;
    const message = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 112, blockedGate.label.text, {
        backgroundColor: '#07130fea',
        color: '#f3ead0',
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(500);
    this.tweens.add({
      targets: message,
      alpha: 0,
      delay: 650,
      duration: 350,
      onComplete: () => message.destroy(),
    });
  };

  private readonly recordGuardianPurified = (guardianId: GuardianId): void => {
    if (!this.saveData || this.saveData.guardians[guardianId]) return;

    this.saveData.guardians[guardianId] = true;
    const allPurified = Object.values(this.saveData.guardians).every(Boolean);
    if (allPurified) {
      this.showReturnToSanctuary();
    }
    saveGame(this.saveData);
    this.updateObjectiveText();
    this.updateObjectiveWaypoint();
  };

  private readonly showReturnToSanctuary = (): void => {
    this.guardianHintText?.setVisible(false);
    const message = this.add
      .text(GAME_WIDTH / 2, 225, [
        'ALL GUARDIANS RESTORED',
        'Follow the green waypoint to the central sanctuary.',
      ], {
        align: 'center',
        backgroundColor: '#07130fee',
        color: '#f3ead0',
        fontFamily: 'Georgia, serif',
        fontSize: '19px',
        fontStyle: 'bold',
        lineSpacing: 5,
        padding: { x: 20, y: 12 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(601);

    this.tweens.add({
      targets: message,
      alpha: 0,
      delay: 2200,
      duration: 500,
      onComplete: () => message.destroy(),
    });
  };

  private readonly completeJourney = (): void => {
    if (!this.saveData || this.saveData.completed) return;

    this.saveData.completed = true;
    saveGame(this.saveData);
    this.journeyFinished = true;
    this.physics.pause();
    this.reticle?.setVisible(false);
    this.interactionText?.setVisible(false);
    this.guardianHintText?.setVisible(false);

    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 760, 390, 0x07130f, 0.97)
      .setStrokeStyle(6, 0xd5ad55)
      .setScrollFactor(0)
      .setDepth(900);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, [
        'THE SANCTUARY IS WHOLE',
        '',
        'Moon, flame, and tide flow through the wilds once more.',
        'The shattered paths remember their shape.',
        '',
        'JOURNEY COMPLETE',
        '',
        'Press Enter to return to the title',
      ], {
        align: 'center',
        color: '#f3ead0',
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        lineSpacing: 9,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(901);
    this.cameras.main.flash(700, 213, 173, 85, false);
  };

  private readonly togglePause = (): void => {
    this.paused = !this.paused;
    this.input.keyboard?.resetKeys();
    this.pauseOverlay?.setVisible(this.paused);
    this.reticle?.setVisible(!this.paused);

    if (this.paused) {
      this.pauseStartedAt = this.time.now;
      this.physics.pause();
      this.time.paused = true;
      this.tweens.pauseAll();
    } else {
      const pauseDuration = Math.max(0, this.time.now - this.pauseStartedAt);
      this.nextLureAt += pauseDuration;
      this.player?.shiftTimers(pauseDuration);
      this.enemies.forEach((enemy) => enemy.shiftTimers(pauseDuration));
      this.moonStag?.shiftTimers(pauseDuration);
      this.emberBoar?.shiftTimers(pauseDuration);
      this.tideSerpent?.shiftTimers(pauseDuration);
      this.time.paused = false;
      this.tweens.resumeAll();
      this.physics.resume();
    }
  };

  private readonly handleGameHidden = (): void => {
    if (!this.paused && !this.gameOver && !this.journeyFinished) this.togglePause();
  };

  private readonly toggleAudio = (): void => {
    if (!this.gameAudio || !this.saveData) return;

    const muted = this.gameAudio.toggleMuted();
    this.saveData.muted = muted;
    saveGame(this.saveData);
    this.muteText?.setText(muted ? 'AUDIO  MUTED [M]' : 'AUDIO  ON [M]');
    this.muteText?.setColor(muted ? '#786f71' : '#9ebfa8');
  };

  private readonly updateObjectiveText = (): void => {
    if (!this.saveData || !this.objectiveText) return;

    if (this.saveData.completed) {
      this.objectiveText.setText('OBJECTIVE  Sanctuary restored. Explore the wilds freely.');
    } else if (!this.saveData.guardians['moon-stag']) {
      this.objectiveText.setText(
        'OBJECTIVE  Follow gold waypoint. Get close to Moon Stag and press Q three times.',
      );
    } else if (!this.saveData.guardians['ember-boar']) {
      this.objectiveText.setText(
        'OBJECTIVE  Follow orange waypoint. Get close to Ember Boar and press Q.',
      );
    } else if (!this.saveData.guardians['tide-serpent']) {
      this.objectiveText.setText(
        'OBJECTIVE  Follow blue waypoint. Get close to Tide Serpent and press Q for each anchor.',
      );
    } else {
      this.objectiveText.setText('OBJECTIVE  Return to the central sanctuary.');
    }
  };

  private readonly updateObjectiveWaypoint = (): void => {
    if (!this.player || !this.saveData || !this.objectiveWaypoint) return;

    if (!this.saveData.guardians['moon-stag'] && this.moonStag) {
      this.objectiveWaypoint.updateTarget(
        this.player.x,
        this.player.y,
        this.moonStag.x,
        this.moonStag.y,
        'MOON STAG',
        0xd5ad55,
        'Q',
      );
      return;
    }

    if (!this.saveData.guardians['ember-boar'] && this.emberBoar) {
      this.objectiveWaypoint.updateTarget(
        this.player.x,
        this.player.y,
        this.emberBoar.x,
        this.emberBoar.y,
        'EMBER BOAR',
        0xe8794a,
        'Q',
      );
      return;
    }

    if (!this.saveData.guardians['tide-serpent'] && this.tideSerpent) {
      this.objectiveWaypoint.updateTarget(
        this.player.x,
        this.player.y,
        this.tideSerpent.x,
        this.tideSerpent.y,
        'TIDE SERPENT',
        0x8fdbea,
        'Q',
      );
      return;
    }

    if (!this.saveData.completed) {
      this.objectiveWaypoint.updateTarget(
        this.player.x,
        this.player.y,
        1800,
        1200,
        'SANCTUARY',
        0x8fe0c5,
        'E',
      );
      return;
    }

    this.objectiveWaypoint.setVisible(false);
  };

  private readonly completeTutorial = (): void => {
    if (!this.saveData) return;
    this.saveData.tutorialComplete = true;
    saveGame(this.saveData);
  };

  private readonly updateGuardianHint = (): void => {
    if (!this.player || !this.guardianHintText || !this.saveData) return;

    const candidates = [
      {
        id: 'moon-stag' as const,
        guardian: this.moonStag,
        hint: 'MOON STAG  Get close and press Q to destroy the nearest anchor.',
      },
      {
        id: 'ember-boar' as const,
        guardian: this.emberBoar,
        hint: 'EMBER BOAR  Get close and press Q to burn the nearest anchor.',
      },
      {
        id: 'tide-serpent' as const,
        guardian: this.tideSerpent,
        hint: 'TIDE SERPENT  Get close and press Q to flood the nearest anchor.',
      },
    ];
    const nearby = candidates
      .filter(({ id, guardian }) => guardian && !this.saveData!.guardians[id])
      .map((candidate) => ({
        ...candidate,
        distance: Phaser.Math.Distance.Between(
          this.player!.x,
          this.player!.y,
          candidate.guardian!.x,
          candidate.guardian!.y,
        ),
      }))
      .filter(({ distance }) => distance <= 520)
      .sort((left, right) => left.distance - right.distance)[0];

    this.guardianHintText.setVisible(Boolean(nearby));
    if (nearby) this.guardianHintText.setText(nearby.hint);
  };

  private readonly updateRegionDiscovery = (): void => {
    if (!this.player) return;

    const sanctuaryDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, 1800, 1200);
    let region = 'SHATTERED SANCTUARY';
    if (sanctuaryDistance > 520) {
      if (this.player.x < 1500) region = 'MOONWOOD';
      else if (this.player.y < 1200) region = 'ASHEN VALLEY';
      else region = 'DROWNED RUINS';
    }
    if (this.discoveredRegions.has(region)) return;

    this.discoveredRegions.add(region);
    this.regionBanner?.destroy();
    const banner = this.add
      .text(GAME_WIDTH / 2, 55, region, {
        backgroundColor: '#07130fda',
        color: '#d5ad55',
        fontFamily: 'Georgia, serif',
        fontSize: '25px',
        fontStyle: 'bold',
        letterSpacing: 4,
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(420);
    this.regionBanner = banner;
    this.tweens.add({
      targets: banner,
      alpha: 0,
      delay: 1200,
      duration: 500,
      onComplete: () => {
        banner.destroy();
        if (this.regionBanner === banner) this.regionBanner = undefined;
      },
    });
  };

  private readonly addEntityShadow = (
    target: Phaser.Physics.Arcade.Sprite,
    width: number,
    height: number,
    yOffset: number,
  ): void => {
    const shadow = this.add
      .ellipse(target.x, target.y + yOffset, width, height, 0x020705, 0.32)
      .setDepth(39);
    this.entityShadows.push({ target, shadow, yOffset });
  };

  private readonly updateEntityShadows = (): void => {
    this.entityShadows.forEach(({ target, shadow, yOffset }) => {
      if (!target.active || !target.visible) {
        shadow.setVisible(false);
        return;
      }

      const depth = 40 + target.y / 10000;
      target.setDepth(depth);
      shadow
        .setVisible(true)
        .setPosition(target.x, target.y + yOffset)
        .setDepth(depth - 0.01)
        .setAlpha(target.alpha * 0.32);
    });
  };
}
