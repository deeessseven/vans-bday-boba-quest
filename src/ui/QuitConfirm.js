/**
 * showQuitConfirm — reusable quit-to-title dialog.
 * @param {Phaser.Scene} scene    The scene to add the dialog to.
 * @param {Function}     onQuit   Called (after the fade) when the player confirms quit.
 */
export function showQuitConfirm(scene, onQuit) {
  const { width, height } = scene.scale;
  const boxW = width - 60, boxH = 180, boxX = 30, boxY = height / 2 - boxH / 2;

  const overlay = scene.add.graphics().setDepth(30);
  overlay.fillStyle(0x000000, 0.55);
  overlay.fillRect(0, 0, width, height);
  overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);

  const box = scene.add.graphics().setDepth(31);
  box.fillStyle(0x0a0a22, 0.97);
  box.fillRoundedRect(boxX, boxY, boxW, boxH, 10);
  box.lineStyle(2, 0x4488cc, 1);
  box.strokeRoundedRect(boxX, boxY, boxW, boxH, 10);

  const msg = scene.add.text(width / 2, boxY + 44, 'Quit to title screen?', {
    fontSize: '30px', color: '#ccddff', fontFamily: 'serif'
  }).setOrigin(0.5).setDepth(32);

  const sub = scene.add.text(width / 2, boxY + 82, 'Unsaved progress will be lost.', {
    fontSize: '22px', color: '#778899', fontFamily: 'serif', fontStyle: 'italic'
  }).setOrigin(0.5).setDepth(32);

  const btnY = boxY + boxH - 38;
  const halfW = boxW / 2;
  const btnH = 48;
  const noX = boxX + 16;          const noW = halfW - 28;
  const yesX = boxX + halfW + 12; const yesW = halfW - 28;

  let noBg, noLbl, noHit, yesBg, yesLbl, yesHit;
  const destroy = () => {
    overlay.destroy(); box.destroy(); msg.destroy(); sub.destroy();
    noBg.destroy(); noLbl.destroy(); noHit.destroy();
    yesBg.destroy(); yesLbl.destroy(); yesHit.destroy();
  };

  noBg  = scene.add.graphics().setDepth(32);
  noLbl = scene.add.text(noX + noW / 2, btnY, 'Cancel', {
    fontSize: '28px', color: '#aaccff', fontFamily: 'serif'
  }).setOrigin(0.5).setDepth(33);
  const drawNo = (hover) => {
    noBg.clear();
    noBg.fillStyle(hover ? 0x223355 : 0x111833, 1);
    noBg.fillRoundedRect(noX, btnY - btnH / 2, noW, btnH, 6);
    noBg.lineStyle(1.5, hover ? 0x6699cc : 0x334466, 1);
    noBg.strokeRoundedRect(noX, btnY - btnH / 2, noW, btnH, 6);
  };
  drawNo(false);
  noHit = scene.add.rectangle(noX + noW / 2, btnY, noW, btnH)
    .setOrigin(0.5).setDepth(34).setInteractive({ useHandCursor: true });
  noHit.on('pointerover',  () => { drawNo(true);  noLbl.setColor('#ffffff'); });
  noHit.on('pointerout',   () => { drawNo(false); noLbl.setColor('#aaccff'); });
  noHit.on('pointerdown',  () => destroy());

  yesBg  = scene.add.graphics().setDepth(32);
  yesLbl = scene.add.text(yesX + yesW / 2, btnY, 'Quit', {
    fontSize: '28px', color: '#ffaaaa', fontFamily: 'serif'
  }).setOrigin(0.5).setDepth(33);
  const drawYes = (hover) => {
    yesBg.clear();
    yesBg.fillStyle(hover ? 0x552233 : 0x331122, 1);
    yesBg.fillRoundedRect(yesX, btnY - btnH / 2, yesW, btnH, 6);
    yesBg.lineStyle(1.5, hover ? 0xcc6699 : 0x663344, 1);
    yesBg.strokeRoundedRect(yesX, btnY - btnH / 2, yesW, btnH, 6);
  };
  drawYes(false);
  yesHit = scene.add.rectangle(yesX + yesW / 2, btnY, yesW, btnH)
    .setOrigin(0.5).setDepth(34).setInteractive({ useHandCursor: true });
  yesHit.on('pointerover',  () => { drawYes(true);  yesLbl.setColor('#ffffff'); });
  yesHit.on('pointerout',   () => { drawYes(false); yesLbl.setColor('#ffaaaa'); });
  yesHit.on('pointerdown',  () => {
    destroy();
    scene.cameras.main.fade(400, 0, 0, 0, false, (cam, progress) => {
      if (progress === 1) onQuit();
    });
  });
}
