import Phaser from 'phaser';
import { createGameConfig } from './game/config';
import './style.css';

const game = new Phaser.Game(createGameConfig('game'));
game.canvas.tabIndex = 0;
game.canvas.addEventListener('pointerdown', () => game.canvas.focus());

if (import.meta.hot) {
  import.meta.hot.dispose(() => game.destroy(true));
}
