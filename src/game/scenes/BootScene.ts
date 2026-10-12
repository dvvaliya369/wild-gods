import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../constants';

export class BootScene extends Phaser.Scene {
  private failedAssets = 0;

  constructor() {
    super(SCENE_KEYS.boot);
  }

  preload(): void {
    this.cameras.main.setBackgroundColor('#07130f');
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 105, 'WILD GODS', {
        color: '#f3ead0',
        fontFamily: 'Georgia, serif',
        fontSize: '44px',
        fontStyle: 'bold',
        letterSpacing: 6,
      })
      .setOrigin(0.5);
    const status = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 65, 'Preparing the sanctuary...', {
        color: '#9ebfa8',
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
      })
      .setOrigin(0.5);
    const frame = this.add.graphics();
    frame.lineStyle(3, 0xd5ad55, 0.65);
    frame.strokeRoundedRect(GAME_WIDTH / 2 - 210, GAME_HEIGHT / 2 - 8, 420, 30, 8);
    const progressBar = this.add.graphics();

    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xd5ad55, 0.9);
      progressBar.fillRoundedRect(
        GAME_WIDTH / 2 - 202,
        GAME_HEIGHT / 2,
        404 * progress,
        14,
        5,
      );
      status.setText(`Preparing the sanctuary... ${Math.round(progress * 100)}%`);
    });
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, () => {
      this.failedAssets += 1;
      status.setColor('#e886a9').setText('Some artwork could not be loaded. Using safe fallbacks.');
    });

    this.load.image('hero-combat', 'assets/images/hero-combat.png');
    this.load.image('hero-portrait', 'assets/images/hero-portrait.png');
    this.load.image('moon-stag', 'assets/images/moon-stag.png');
    this.load.image('ember-boar', 'assets/images/ember-boar.png');
    this.load.image('tide-serpent', 'assets/images/tide-serpent.png');
    this.load.image('shadow-hunter', 'assets/images/shadow-hunter.png');
    this.load.image('moonwood-ground', 'assets/images/moonwood-ground.png');
    this.load.image('ashen-ground', 'assets/images/ashen-ground.png');
    this.load.image('drowned-ground', 'assets/images/drowned-ground.png');
  }

  create(): void {
    if (this.failedAssets > 0) {
      this.time.delayedCall(900, () => this.scene.start(SCENE_KEYS.title));
      return;
    }
    this.scene.start(SCENE_KEYS.title);
  }
}
