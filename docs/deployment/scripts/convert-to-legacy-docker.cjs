/**
 * convert-to-legacy-docker.cjs
 * 將 OCI blobs 格式的 tar 轉換為 QNAP Container Station / 傳統 Docker 絕對相容格式
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORK_DIR = path.resolve(__dirname, '../.docker-legacy-tmp');
const SRC_TAR = path.resolve(__dirname, '../stock-tracker-nas.tar');
const OUT_TAR = path.resolve(__dirname, '../stock-tracker-nas.tar');

console.log('開始解包與重構為傳統 Docker V2 標準格式...');

// 清理暫存目錄
if (fs.existsSync(WORK_DIR)) {
  fs.rmSync(WORK_DIR, { recursive: true, force: true });
}
fs.mkdirSync(WORK_DIR, { recursive: true });

// 解包原本的 tar
execSync(`tar -xf "${SRC_TAR}" -C "${WORK_DIR}"`);

const manifestRaw = fs.readFileSync(path.join(WORK_DIR, 'manifest.json'), 'utf8');
const manifests = JSON.parse(manifestRaw);

const item = manifests[0];
const configBlob = item.Config; // e.g. "blobs/sha256/1fb75..."
const configHash = path.basename(configBlob);
const configDestName = `${configHash}.json`;

// 將 config blob 複製到根目錄並加上 .json
fs.copyFileSync(path.join(WORK_DIR, configBlob), path.join(WORK_DIR, configDestName));

const newLayers = [];
let lastLayerId = '';

item.Layers.forEach((layerBlob, index) => {
  const layerHash = path.basename(layerBlob);
  const layerDir = path.join(WORK_DIR, layerHash);
  fs.mkdirSync(layerDir, { recursive: true });

  // 複製 blob 為 layer.tar
  fs.copyFileSync(path.join(WORK_DIR, layerBlob), path.join(layerDir, 'layer.tar'));

  // 寫入 VERSION
  fs.writeFileSync(path.join(layerDir, 'VERSION'), '1.0\n');

  // 寫入基礎 json
  const layerJson = {
    id: layerHash,
    created: '1970-01-01T00:00:00Z',
    container_config: { Hostname: '', Domainname: '', User: '' },
  };
  fs.writeFileSync(path.join(layerDir, 'json'), JSON.stringify(layerJson));

  newLayers.push(`${layerHash}/layer.tar`);
  lastLayerId = layerHash;
});

// 重構 manifest.json
const newManifest = [
  {
    Config: configDestName,
    RepoTags: ['stock-tracker:latest'],
    Layers: newLayers,
  },
];
fs.writeFileSync(path.join(WORK_DIR, 'manifest.json'), JSON.stringify(newManifest, null, 2));

// 寫入傳統 repositories 檔案 (QNAP 核心必驗證)
const repositories = {
  'stock-tracker': {
    latest: lastLayerId,
  },
};
fs.writeFileSync(path.join(WORK_DIR, 'repositories'), JSON.stringify(repositories, null, 2));

// 刪除 blobs 目錄與 index.json
if (fs.existsSync(path.join(WORK_DIR, 'blobs'))) {
  fs.rmSync(path.join(WORK_DIR, 'blobs'), { recursive: true, force: true });
}
if (fs.existsSync(path.join(WORK_DIR, 'index.json'))) {
  fs.unlinkSync(path.join(WORK_DIR, 'index.json'));
}
if (fs.existsSync(path.join(WORK_DIR, 'oci-layout'))) {
  fs.unlinkSync(path.join(WORK_DIR, 'oci-layout'));
}

// 刪除舊的 tar 並重新打包
if (fs.existsSync(OUT_TAR)) {
  fs.unlinkSync(OUT_TAR);
}

// 在暫存目錄下打包所有檔案
execSync(`tar -cf "${OUT_TAR}" -C "${WORK_DIR}" .`);

// 清理暫存目錄
fs.rmSync(WORK_DIR, { recursive: true, force: true });

console.log('✔ 重構完成！產出 100% 傳統 Docker 標準格式:', OUT_TAR);
