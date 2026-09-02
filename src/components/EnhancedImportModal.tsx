import React, { useState, useMemo, useEffect } from 'react';
import {
  UploadCloud,
  X,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Settings2,
  Sparkles,
  Save,
  Layers,
} from 'lucide-react';
import { BrokerAccount, TradeRecord } from '../types/stock';
import {
  BrokerTemplateId,
  BUILTIN_BROKER_TEMPLATES,
  detectBrokerTemplate,
  ColumnMappingConfig,
} from '../engine/brokerTemplates';
import {
  normalizeDateString,
  sanitizeNumeric,
  inferTradeType,
  resolveSymbolAndName,
} from '../engine/csvSanitizer';
import {
  analyzeTradesDeduplication,
  applyImportDeduplication,
  ImportDeduplicationMode,
} from '../engine/tradeDeduplicator';
import { validateTradesSchema } from '../utils/storage';

interface EnhancedImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BrokerAccount[];
  existingTrades: TradeRecord[];
  onConfirmImport: (
    trades: TradeRecord[],
    mode: ImportDeduplicationMode,
    rawIncomingCount: number
  ) => void;
}

function parseCSVRawLines(csvText: string): string[][] {
  let cleaned = csvText;
  if (cleaned.charCodeAt(0) === 0xfeff) cleaned = cleaned.slice(1);
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map((line) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

export const EnhancedImportModal: React.FC<EnhancedImportModalProps> = ({
  isOpen,
  onClose,
  accounts,
  existingTrades,
  onConfirmImport,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [isJSONFile, setIsJSONFile] = useState<boolean>(false);
  const [parsedJSONTrades, setParsedJSONTrades] = useState<TradeRecord[]>([]);

  // CSV 解析狀態
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<BrokerTemplateId>('STANDARD');
  const [customMapping, setCustomMapping] = useState<ColumnMappingConfig>(
    BUILTIN_BROKER_TEMPLATES.STANDARD.mapping
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // 重置狀態
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setRawFile(null);
      setIsJSONFile(false);
      setParsedJSONTrades([]);
      setCsvHeaders([]);
      setCsvRows([]);
      setSelectedTemplateId('STANDARD');
      setCustomMapping(BUILTIN_BROKER_TEMPLATES.STANDARD.mapping);
      const defaultTwAcc = accounts.find((a) => a.market === 'TW')?.id || accounts[0]?.id || '';
      setSelectedAccountId(defaultTwAcc);
    }
  }, [isOpen, accounts]);

  // 讀取檔案
  const handleFileUpload = (file: File) => {
    setRawFile(file);
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.json')) {
      setIsJSONFile(true);
      const reader = new FileReader();
      reader.readAsText(file, 'UTF-8');
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          const validated = validateTradesSchema(parsed);
          if (validated && validated.length > 0) {
            setParsedJSONTrades(validated);
            setCurrentStep(3); // JSON 直通預覽與確認
          } else {
            alert('❌ JSON 備份檔格式不符或缺少必要交易欄位！');
          }
        } catch {
          alert('❌ JSON 解析失敗，請確認檔案格式！');
        }
      };
    } else {
      setIsJSONFile(false);
      const reader = new FileReader();
      reader.readAsText(file, 'UTF-8');
      reader.onload = (e) => {
        const content = (e.target?.result as string) || '';
        processCSVContent(content);
      };
    }
  };

  const processCSVContent = (content: string) => {
    const lines = parseCSVRawLines(content);
    if (lines.length < 2) {
      alert('❌ CSV 檔案內容行數不足，無法提取標題與紀錄！');
      return;
    }
    const headers = lines[0];
    const dataRows = lines.slice(1);
    setCsvHeaders(headers);
    setCsvRows(dataRows);

    // 自動偵測券商
    const detected = detectBrokerTemplate(headers);
    setSelectedTemplateId(detected.id);
    setCustomMapping(detected.mapping);

    // 自動指定對應市場之帳戶
    const acc =
      accounts.find((a) => a.market === detected.defaultMarket)?.id ||
      accounts[0]?.id ||
      '';
    setSelectedAccountId(acc);

    setCurrentStep(2);
  };

  // 切換範本
  const handleTemplateChange = (tid: BrokerTemplateId) => {
    setSelectedTemplateId(tid);
    if (tid !== 'CUSTOM') {
      const tpl = BUILTIN_BROKER_TEMPLATES[tid];
      setCustomMapping({ ...tpl.mapping });
      const acc = accounts.find((a) => a.market === tpl.defaultMarket)?.id || accounts[0]?.id || '';
      setSelectedAccountId(acc);
    }
  };

  // 儲存自訂範本至 LocalStorage
  const handleSaveCustomTemplate = () => {
    try {
      localStorage.setItem('stock_tracker_custom_csv_mapping', JSON.stringify(customMapping));
      alert('✅ 已成功將目前的欄位映射儲存為預設自訂範本！');
    } catch {
      alert('❌ 儲存自訂範本失敗。');
    }
  };

  // 依據當前映射與清洗引擎將 CSV Rows 轉換為 Partial<TradeRecord>[]
  const parsedIncomingTrades: Partial<TradeRecord>[] = useMemo(() => {
    if (isJSONFile) {
      return parsedJSONTrades;
    }
    if (csvRows.length === 0 || csvHeaders.length === 0) return [];

    const getColIndex = (colName?: string): number => {
      if (!colName) return -1;
      const lower = colName.trim().toLowerCase();
      return csvHeaders.findIndex((h) => h.trim().toLowerCase() === lower);
    };

    const idxDate = getColIndex(customMapping.date);
    const idxSymbol = getColIndex(customMapping.symbol);
    const idxName = getColIndex(customMapping.name);
    const idxType = getColIndex(customMapping.type);
    const idxShares = getColIndex(customMapping.shares);
    const idxPrice = getColIndex(customMapping.price);
    const idxFee = getColIndex(customMapping.fee);
    const idxTax = getColIndex(customMapping.tax);
    const idxMarket = getColIndex(customMapping.market);
    const idxNote = getColIndex(customMapping.note);

    const targetAccount = accounts.find((a) => a.id === selectedAccountId);

    return csvRows.map((row, index) => {
      const getVal = (idx: number): string => (idx !== -1 && idx < row.length ? row[idx].trim() : '');

      const rawDate = getVal(idxDate);
      const rawSymbol = getVal(idxSymbol);
      const rawName = getVal(idxName);
      const rawType = getVal(idxType);
      const rawShares = getVal(idxShares);
      const rawPrice = getVal(idxPrice);
      const rawFee = getVal(idxFee);
      const rawTax = getVal(idxTax);
      const rawMarket = getVal(idxMarket);
      const rawNote = getVal(idxNote);

      const cleanDate = normalizeDateString(rawDate);
      const sec = resolveSymbolAndName(rawSymbol, rawName, rawMarket || targetAccount?.market);
      const tradeType = inferTradeType(rawType);
      const shares = sanitizeNumeric(rawShares, NaN);
      const price = sanitizeNumeric(rawPrice, NaN);
      const fee = sanitizeNumeric(rawFee, 0);
      const tax = sanitizeNumeric(rawTax, 0);

      const finalMarket = targetAccount?.market || sec.market;
      const finalCurrency = targetAccount ? (targetAccount.market === 'US' ? 'USD' : 'TWD') : sec.currency;

      return {
        id: `incoming-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
        date: cleanDate,
        symbol: sec.symbol,
        name: sec.name,
        market: finalMarket,
        currency: finalCurrency,
        type: tradeType,
        accountId: selectedAccountId || (finalMarket === 'US' ? 'broker-us-default' : 'broker-tw-default'),
        shares,
        price,
        fee,
        tax,
        note: rawNote || undefined,
      };
    });
  }, [
    isJSONFile,
    parsedJSONTrades,
    csvRows,
    csvHeaders,
    customMapping,
    selectedAccountId,
    accounts,
  ]);

  // 去重分析結果
  const deduplicationResult = useMemo(() => {
    return analyzeTradesDeduplication(parsedIncomingTrades, existingTrades);
  }, [parsedIncomingTrades, existingTrades]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div
        className="glass-card modal-content"
        style={{
          maxWidth: '860px',
          width: '94%',
          maxHeight: '90vh',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header & Steps Indicator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                padding: '8px',
                borderRadius: '10px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#3b82f6',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                增強型 CSV / JSON 智慧匯入精靈
              </h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {rawFile ? `已選擇檔案: ${rawFile.name}` : '支援國泰、富邦、永豐、元大、Firstrade、Schwab、IB 等主流券商'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Tabs Indicator */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginBottom: '18px',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '6px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
          }}
        >
          <button
            onClick={() => setCurrentStep(1)}
            style={{
              background: currentStep === 1 ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
              border: currentStep === 1 ? '1px solid #3b82f6' : '1px solid transparent',
              borderRadius: '8px',
              padding: '8px 12px',
              color: currentStep === 1 ? '#60a5fa' : 'var(--text-secondary)',
              fontWeight: currentStep === 1 ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.82rem',
            }}
          >
            <UploadCloud size={16} />
            步驟 1: 上傳與自動辨識
          </button>

          <button
            onClick={() => currentStep > 1 && setCurrentStep(2)}
            disabled={!rawFile || isJSONFile}
            style={{
              background: currentStep === 2 ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
              border: currentStep === 2 ? '1px solid #3b82f6' : '1px solid transparent',
              borderRadius: '8px',
              padding: '8px 12px',
              color: currentStep === 2 ? '#60a5fa' : 'var(--text-secondary)',
              fontWeight: currentStep === 2 ? 700 : 500,
              cursor: rawFile && !isJSONFile ? 'pointer' : 'not-allowed',
              opacity: rawFile && !isJSONFile ? 1 : 0.4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.82rem',
            }}
          >
            <Settings2 size={16} />
            步驟 2: 欄位映射與歸戶
          </button>

          <button
            onClick={() => currentStep >= 2 && setCurrentStep(3)}
            disabled={!rawFile}
            style={{
              background: currentStep === 3 ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
              border: currentStep === 3 ? '1px solid #3b82f6' : '1px solid transparent',
              borderRadius: '8px',
              padding: '8px 12px',
              color: currentStep === 3 ? '#60a5fa' : 'var(--text-secondary)',
              fontWeight: currentStep === 3 ? 700 : 500,
              cursor: rawFile ? 'pointer' : 'not-allowed',
              opacity: rawFile ? 1 : 0.4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.82rem',
            }}
          >
            <Layers size={16} />
            步驟 3: 逐行預覽與去重入庫
          </button>
        </div>

        {/* Modal Body Content (Scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
          {/* STEP 1: Upload */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  border: '2px dashed rgba(59, 130, 246, 0.4)',
                  background: 'rgba(30, 41, 59, 0.3)',
                  borderRadius: '12px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
                onClick={() => {
                  const input = document.getElementById('enhanced-file-upload-input');
                  if (input) input.click();
                }}
              >
                <div
                  style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                    padding: '16px',
                    borderRadius: '50%',
                  }}
                >
                  <UploadCloud size={32} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    點擊此處或拖曳 CSV / JSON 檔案至此
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    自動支援 Big5 / UTF-8、民國年轉西元、千分位與貨幣符號清洗
                  </div>
                </div>
                <input
                  id="enhanced-file-upload-input"
                  type="file"
                  accept=".csv,.json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                />
              </div>

              {/* Supported Brokers List Grid */}
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  🏛️ 內建即插即用券商表頭指紋庫：
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                  {Object.values(BUILTIN_BROKER_TEMPLATES).map((tpl) => (
                    <div
                      key={tpl.id}
                      style={{
                        background: 'rgba(30, 41, 59, 0.4)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        fontSize: '0.75rem',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{tpl.name}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginTop: '2px' }}>
                        {tpl.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Mapping & Accounts */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Template & Account bar */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  background: 'rgba(30, 41, 59, 0.5)',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    券商範本切換：
                  </label>
                  <select
                    className="input-field"
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateChange(e.target.value as BrokerTemplateId)}
                    style={{ width: '100%' }}
                  >
                    {Object.values(BUILTIN_BROKER_TEMPLATES).map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} ({tpl.defaultMarket})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    指定歸戶券商帳戶：
                  </label>
                  <select
                    className="input-field"
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.market === 'US' ? '美股 / USD' : '台股 / TWD'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Column Mapping Selector Grid */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    🎯 欄位對齊映射 (CSV 來源欄位 ➔ 系統資料結構)
                  </span>
                  <button
                    onClick={handleSaveCustomTemplate}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.72rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Save size={12} />
                    儲存為自訂映射範本
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                  {[
                    { key: 'date', label: '📅 交易日期 (必要)', required: true },
                    { key: 'symbol', label: '🔤 標的代碼 (必要)', required: true },
                    { key: 'type', label: '⚡ 交易類別 (買/賣/息)', required: true },
                    { key: 'shares', label: '🔢 成交股數 (必要)', required: true },
                    { key: 'price', label: '💲 成交單價 (必要)', required: true },
                    { key: 'fee', label: '💸 手續費 (可選)', required: false },
                    { key: 'tax', label: '🏛️ 稅費 (可選)', required: false },
                    { key: 'name', label: '🏷️ 股票名稱 (可選)', required: false },
                    { key: 'note', label: '📝 備註 (可選)', required: false },
                  ].map((field) => {
                    const currentVal = (customMapping as any)[field.key] || '';
                    return (
                      <div key={field.key} style={{ fontSize: '0.78rem' }}>
                        <div style={{ color: field.required ? '#60a5fa' : 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                          {field.label}
                        </div>
                        <select
                          className="input-field"
                          value={currentVal}
                          onChange={(e) => {
                            setCustomMapping((prev) => ({ ...prev, [field.key]: e.target.value }));
                            setSelectedTemplateId('CUSTOM');
                          }}
                          style={{ width: '100%', fontSize: '0.78rem', padding: '6px' }}
                        >
                          <option value="">-- (無或使用預設) --</option>
                          {csvHeaders.map((h, i) => (
                            <option key={`${h}-${i}`} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Preview & Deduplication Summary */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Summary Stats Badges */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  background: 'rgba(30, 41, 59, 0.5)',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>解析總筆數</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {deduplicationResult.summary.total}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#10b981' }}>全新紀錄 (待入庫)</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981' }}>
                    {deduplicationResult.summary.newCount}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#f59e0b' }}>既有重複 (將略過)</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f59e0b' }}>
                    {deduplicationResult.summary.duplicateCount}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#ef4444' }}>格式異常 (缺欄位)</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ef4444' }}>
                    {deduplicationResult.summary.invalidCount}
                  </div>
                </div>
              </div>

              {/* Table Preview */}
              <div
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.6)',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(30, 41, 59, 0.8)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '8px' }}>狀態</th>
                      <th style={{ padding: '8px' }}>日期</th>
                      <th style={{ padding: '8px' }}>標的</th>
                      <th style={{ padding: '8px' }}>類別</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>股數</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>單價</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>手續/稅費</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deduplicationResult.rows.slice(0, 100).map((row, idx) => {
                      const t = row.trade;
                      const isNew = row.status === 'NEW';
                      const isDup = row.status === 'DUPLICATE';

                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            background: isNew
                              ? 'rgba(16, 185, 129, 0.04)'
                              : isDup
                              ? 'rgba(245, 158, 11, 0.04)'
                              : 'rgba(239, 68, 68, 0.08)',
                          }}
                        >
                          <td style={{ padding: '8px' }}>
                            {isNew ? (
                              <span style={{ color: '#10b981', fontWeight: 600 }}>✅ 全新</span>
                            ) : isDup ? (
                              <span style={{ color: '#f59e0b', fontWeight: 600 }}>⚠️ 重複</span>
                            ) : (
                              <span style={{ color: '#ef4444', fontWeight: 600 }}>❌ 異常</span>
                            )}
                          </td>
                          <td style={{ padding: '8px', fontFamily: 'monospace' }}>{t.date || '--'}</td>
                          <td style={{ padding: '8px' }}>
                            <strong>{t.symbol}</strong> <span style={{ color: 'var(--text-secondary)' }}>{t.name}</span>
                          </td>
                          <td style={{ padding: '8px' }}>
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                background:
                                  t.type === 'BUY'
                                    ? 'rgba(239, 68, 68, 0.15)'
                                    : t.type === 'SELL'
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : 'rgba(59, 130, 246, 0.15)',
                                color:
                                  t.type === 'BUY'
                                    ? '#ef4444'
                                    : t.type === 'SELL'
                                    ? '#10b981'
                                    : '#60a5fa',
                              }}
                            >
                              {t.type}
                            </span>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>
                            {t.shares?.toLocaleString()}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>
                            {t.price?.toLocaleString()}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                            {((t.fee || 0) + (t.tax || 0)).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '14px',
          }}
        >
          <div>
            {currentStep > 1 && !isJSONFile && (
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentStep((prev) => (prev === 3 ? 2 : 1))}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
              >
                <ArrowLeft size={16} />
                上一步
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ fontSize: '0.8rem' }}>
              取消
            </button>

            {currentStep === 1 && rawFile && (
              <button
                className="btn btn-primary"
                onClick={() => setCurrentStep(isJSONFile ? 3 : 2)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
              >
                下一步: 欄位映射
                <ArrowRight size={16} />
              </button>
            )}

            {currentStep === 2 && (
              <button
                className="btn btn-primary"
                onClick={() => setCurrentStep(3)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
              >
                下一步: 預覽與確認
                <ArrowRight size={16} />
              </button>
            )}

            {currentStep === 3 && (
              <>
                {/* Option: Overwrite */}
                <button
                  onClick={() => {
                    const finalTrades = applyImportDeduplication('OVERWRITE', parsedIncomingTrades, existingTrades);
                    onConfirmImport(finalTrades, 'OVERWRITE', deduplicationResult.summary.total);
                  }}
                  className="btn btn-secondary"
                  style={{
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.1)',
                    fontSize: '0.8rem',
                  }}
                >
                  全量覆蓋 (快照備份)
                </button>

                {/* Option: Smart Merge (Default Recommended) */}
                <button
                  onClick={() => {
                    const finalTrades = applyImportDeduplication('SMART_MERGE', parsedIncomingTrades, existingTrades);
                    onConfirmImport(finalTrades, 'SMART_MERGE', deduplicationResult.summary.total);
                  }}
                  className="btn btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.8rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  }}
                >
                  <CheckCircle2 size={16} />
                  智慧追加 (自動略過重複: +{deduplicationResult.summary.newCount} 筆)
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
