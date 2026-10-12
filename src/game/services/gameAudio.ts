import Phaser from 'phaser';

export type GameAudio = {
  toggleMuted: () => boolean;
  isMuted: () => boolean;
  destroy: () => void;
};

export const createGameAudio = (scene: Phaser.Scene, initiallyMuted: boolean): GameAudio => {
  let context: AudioContext | undefined;
  let muted = initiallyMuted;

  const playTone = (
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    endFrequency = frequency,
  ): void => {
    if (muted) return;

    try {
      context ??= new AudioContext();
      if (context.state === 'suspended') void context.resume();

      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch {
      muted = true;
    }
  };

  const playSpear = (): void => playTone(260, 0.09, 'sawtooth', 0.05, 110);
  const playDamage = (): void => playTone(115, 0.22, 'square', 0.06, 55);
  const playEnemyDefeat = (): void => playTone(190, 0.3, 'triangle', 0.06, 45);
  const playLure = (): void => playTone(620, 0.38, 'sine', 0.05, 980);
  const playAnchor = (): void => playTone(145, 0.42, 'sawtooth', 0.07, 38);
  const playPurification = (): void => {
    playTone(330, 0.8, 'sine', 0.04, 660);
    playTone(495, 0.9, 'sine', 0.035, 990);
    playTone(660, 1, 'triangle', 0.03, 1320);
  };

  scene.events.on('player-spear-attack', playSpear);
  scene.events.on('player-health-changed', playDamage);
  scene.events.on('shadow-enemy-defeated', playEnemyDefeat);
  scene.events.on('lure-activated', playLure);
  scene.events.on('anchor-destroyed', playAnchor);
  scene.events.on('moon-stag-purified', playPurification);
  scene.events.on('ember-boar-purified', playPurification);
  scene.events.on('tide-serpent-purified', playPurification);

  const destroy = (): void => {
    scene.events.off('player-spear-attack', playSpear);
    scene.events.off('player-health-changed', playDamage);
    scene.events.off('shadow-enemy-defeated', playEnemyDefeat);
    scene.events.off('lure-activated', playLure);
    scene.events.off('anchor-destroyed', playAnchor);
    scene.events.off('moon-stag-purified', playPurification);
    scene.events.off('ember-boar-purified', playPurification);
    scene.events.off('tide-serpent-purified', playPurification);
    void context?.close();
    context = undefined;
  };

  return {
    toggleMuted: () => {
      muted = !muted;
      return muted;
    },
    isMuted: () => muted,
    destroy,
  };
};
