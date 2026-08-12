import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../game/constants';
import { AssetPaths, getAssetPath, type AssetKey } from '../assets';

/**
 * 预加载场景：遍历 src/assets.ts 的 AssetPaths 全量加载。
 * 资产 key（assetId）即作为 Phaser 纹理 key，渲染层只用 assetId 取纹理，
 * 与 visuals.json 的 objectVisuals/dangerOverlays 映射保持一致。
 * SVG 用 load.svg（保留矢量轮廓后栅格化），PNG 用 load.image。
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    this.renderProgressText();

    (Object.keys(AssetPaths) as AssetKey[]).forEach((key) => {
      // AssetPaths are rooted for local development.  Prefix them with Vite's
      // public base so the same build also works from GitHub Pages (/moyu/).
      const url = `${import.meta.env.BASE_URL}${getAssetPath(key).replace(/^\//, '')}`;
      if (url.toLowerCase().endsWith('.svg')) {
        this.load.svg(key, url);
      } else {
        this.load.image(key, url);
      }
    });
  }

  create(): void {
    this.scene.start('GameScene');
  }

  private renderProgressText(): void {
    const label = this.add
      .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '加载中…', {
        color: '#2C3E50',
        fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
        fontSize: '28px',
      })
      .setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      label.setText(`加载中… ${Math.round(value * 100)}%`);
    });
  }
}
