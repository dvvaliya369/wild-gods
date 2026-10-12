import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../constants';
import { clearGameSave, hasSavedProgress, loadGameSave } from '../services/gameStorage';

export class TitleScene extends Phaser.Scene {
  private transitioning = false;

  constructor() {
    super(SCENE_KEYS.title);
  }

  create(): void {
    const save = loadGameSave();
    const hasProgress = hasSavedProgress(save);
    const centerX = GAME_WIDTH / 2;
    this.transitioning = false;
    this.cameras.main.fadeIn(500, 7, 19, 15);

    const guardianArt = [
      { key: 'moon-stag', x: 135, y: 175, size: 220, angle: -10 },
      { key: 'ember-boar', x: 180, y: 565, size: 220, angle: 8 },
      { key: 'tide-serpent', x: GAME_WIDTH - 135, y: 590, size: 210, angle: -8 },
    ];
    guardianArt.forEach(({ key, x, y, size, angle }) => {
      if (!this.textures.exists(key)) return;
      this.add
        .image(x, y, key)
        .setDisplaySize(size, size)
        .setAngle(angle)
        .setAlpha(0.2);
    });

    if (this.textures.exists('hero-portrait')) {
      this.add
        .image(GAME_WIDTH - 220, GAME_HEIGHT / 2 + 15, 'hero-portrait')
        .setDisplaySize(390, 390)
        .setAlpha(0.72);
    }

    this.add.circle(centerX, 270, 190, 0xd5ad55, 0.07);
    this.add.circle(centerX, 270, 130, 0xd5ad55, 0.09);
    this.add
      .text(centerX, 205, 'WILD GODS', {
        color: '#f3ead0',
        fontFamily: 'Georgia, serif',
        fontSize: '70px',
        fontStyle: 'bold',
        letterSpacing: 9,
      })
      .setOrigin(0.5);
    this.add
      .text(centerX, 280, 'SHATTERED SANCTUARY', {
        color: '#d5ad55',
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        letterSpacing: 6,
      })
      .setOrigin(0.5);
    this.add
      .text(centerX, 335, 'Their fury is your only weapon.', {
        color: '#9ebfa8',
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);

    let primaryButton: Phaser.GameObjects.Text;
    if (save.completed) {
      this.add
        .text(centerX, 405, 'JOURNEY COMPLETE', {
          color: '#8fe0c5',
          fontFamily: 'Arial, sans-serif',
          fontSize: '15px',
          fontStyle: 'bold',
          letterSpacing: 3,
        })
        .setOrigin(0.5);
      primaryButton = this.createButton(centerX, 475, 'NEW JOURNEY', () => {
        this.startGame(true);
      });
    } else {
      primaryButton = this.createButton(
        centerX,
        440,
        hasProgress ? 'CONTINUE' : 'BEGIN JOURNEY',
        () => this.startGame(false),
      );

      if (hasProgress) {
        this.createButton(centerX, 505, 'NEW JOURNEY', () => {
          this.startGame(true);
        });
      }
    }

    this.add
      .text(centerX, GAME_HEIGHT - 56, 'WASD to move · Mouse to aim · Click to attack', {
        color: '#718f7c',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
      })
      .setOrigin(0.5);

    primaryButton.emit('pointerout');
  }

  private readonly startGame = (newJourney: boolean): void => {
    if (this.transitioning) return;
    this.transitioning = true;
    if (newJourney) clearGameSave();
    this.cameras.main.fadeOut(420, 7, 19, 15);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.game);
    });
  };

  private readonly createButton = (
    x: number,
    y: number,
    label: string,
    onSelect: () => void,
  ): Phaser.GameObjects.Text => {
    const button = this.add
      .text(x, y, label, {
        backgroundColor: '#1c382b',
        color: '#f3ead0',
        fontFamily: 'Arial, sans-serif',
        fontSize: '19px',
        fontStyle: 'bold',
        padding: { x: 34, y: 14 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on('pointerover', () => button.setStyle({ backgroundColor: '#365a43', color: '#fff4cb' }));
    button.on('pointerout', () => button.setStyle({ backgroundColor: '#1c382b', color: '#f3ead0' }));
    button.on('pointerdown', onSelect);
    return button;
  };
}
