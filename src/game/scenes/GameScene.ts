import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../constants';

export class GameScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.game);
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.add.circle(centerX, centerY - 58, 148, 0xd6ae55, 0.08);
    this.add.circle(centerX, centerY - 58, 104, 0xd6ae55, 0.1);

    this.add
      .text(centerX, centerY - 82, 'WILD GODS', {
        color: '#f3ead0',
        fontFamily: 'Georgia, serif',
        fontSize: '64px',
        fontStyle: 'bold',
        letterSpacing: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY - 10, 'SHATTERED SANCTUARY', {
        color: '#d6ae55',
        fontFamily: 'Arial, sans-serif',
        fontSize: '19px',
        letterSpacing: 5,
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, GAME_HEIGHT - 72, 'Their fury is your only weapon.', {
        color: '#9ebfa8',
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);
  }
}
