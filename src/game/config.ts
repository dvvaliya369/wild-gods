import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './constants';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { TitleScene } from './scenes/TitleScene';

export const createGameConfig = (parent: string): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  parent,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#10271c',
  banner: false,
  autoFocus: true,
  disableContextMenu: true,
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    powerPreference: 'high-performance',
  },
  fps: {
    target: 60,
    min: 30,
    smoothStep: true,
    forceSetTimeOut: false,
  },
  input: {
    activePointers: 2,
    windowEvents: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    fullscreenTarget: 'app',
  },
  scene: [BootScene, TitleScene, GameScene],
});
