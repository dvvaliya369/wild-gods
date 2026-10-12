import Phaser from 'phaser';

export const configureCircleBody = (
  sprite: Phaser.Physics.Arcade.Sprite,
  worldRadius: number,
): void => {
  const body = sprite.body as Phaser.Physics.Arcade.Body;
  const scale = Math.min(Math.abs(sprite.scaleX), Math.abs(sprite.scaleY));
  const sourceRadius = worldRadius / Math.max(scale, 0.001);
  const offsetX = (sprite.frame.realWidth - sourceRadius * 2) / 2;
  const offsetY = (sprite.frame.realHeight - sourceRadius * 2) / 2;
  body.setCircle(sourceRadius, offsetX, offsetY);
};
