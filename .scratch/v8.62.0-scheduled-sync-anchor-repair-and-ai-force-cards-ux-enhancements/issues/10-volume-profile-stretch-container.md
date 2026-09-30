# 10 — 籌碼熱區圖容器 stretch 填滿 (移除寫死 190px)

**What to build:**
修改 `VolumeProfileCard.tsx`，將繪圖 Grid 主容器由原本寫死高度 `height: '190px'` 改為 `flex: 1` 與 `height: '100%'`，並設定 `alignItems: 'stretch'`，使熱區繪圖區能隨卡片高度自適應撐滿。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 移除 Y 軸、熱力格列與圖例上寫死的 `height: '190px'`。
- [ ] 主繪圖容器設定為 `flex: 1` 且垂直自適應伸展。
