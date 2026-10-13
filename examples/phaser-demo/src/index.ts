import Phaser from 'phaser';
import type { NeoGameInstance2D } from '@neotap.app/neo-engine';

class DemoScene extends Phaser.Scene {
  constructor() {
    super('demo');
  }

  create() {
    this.add.text(20, 20, 'Neo Engine 2D Demo', { fontSize: '32px', color: '#ffffff' });

    const rect = this.add.rectangle(400, 300, 100, 100, 0x4a90d9);
    this.tweens.add({
      targets: rect,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }
}

const game: NeoGameInstance2D = {
  mode: '2d',
  config: {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#1a1a2e',
    parent: undefined,
    scene: [DemoScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  },
  create(ctx) {
    ctx.storage.set('visited', '1');
  },
};

export default game;
