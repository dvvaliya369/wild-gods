import Phaser from 'phaser';

export const createAmbientEffects = (scene: Phaser.Scene): void => {
  const random = new Phaser.Math.RandomDataGenerator(['wild-gods-ambience']);

  for (let index = 0; index < 22; index += 1) {
    const mote = scene.add
      .circle(
        random.between(80, 1420),
        random.between(80, 2320),
        random.between(2, 5),
        0x72d9c4,
        random.realInRange(0.12, 0.32),
      )
      .setDepth(10);
    scene.tweens.add({
      targets: mote,
      x: mote.x + random.between(-28, 28),
      y: mote.y - random.between(35, 85),
      alpha: 0.04,
      duration: random.between(2400, 4600),
      delay: random.between(0, 1800),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  for (let index = 0; index < 20; index += 1) {
    const ember = scene.add
      .circle(
        random.between(2250, 3540),
        random.between(70, 1130),
        random.between(2, 4),
        0xff8a42,
        random.realInRange(0.18, 0.38),
      )
      .setDepth(10);
    scene.tweens.add({
      targets: ember,
      x: ember.x + random.between(-20, 20),
      y: ember.y - random.between(55, 120),
      alpha: 0,
      duration: random.between(1300, 2700),
      delay: random.between(0, 1400),
      yoyo: true,
      repeat: -1,
    });
  }

  for (let index = 0; index < 18; index += 1) {
    const glint = scene.add
      .ellipse(
        random.between(2260, 3520),
        random.between(1280, 2320),
        random.between(14, 34),
        random.between(4, 9),
        0x9cebf2,
        random.realInRange(0.08, 0.2),
      )
      .setDepth(10);
    scene.tweens.add({
      targets: glint,
      scaleX: random.realInRange(1.4, 2.1),
      alpha: 0,
      duration: random.between(1700, 3200),
      delay: random.between(0, 1700),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
};
