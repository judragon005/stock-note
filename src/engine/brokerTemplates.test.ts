import { describe, it, expect } from 'vitest';
import {
  detectBrokerTemplate,
  BrokerTemplateId,
} from './brokerTemplates';

describe('Seam 1: brokerTemplates - 券商表頭指紋自動識別 (detectBrokerTemplate)', () => {
  it('給予國泰證券表頭特徵，應精準識別為 CATHAY', () => {
    const headers = ['成交日期', '委託書號', '股票代號', '股票名稱', '買賣別', '成交股數', '成交單價', '手續費', '交易稅'];
    const detected = detectBrokerTemplate(headers);
    expect(detected.id).toBe<BrokerTemplateId>('CATHAY');
    expect(detected.name).toBe('國泰證券');
  });

  it('給予永豐大戶投表頭特徵，應精準識別為 SINOPAC', () => {
    const headers = ['委託日期', '商品代碼', '商品名稱', '買賣別', '成交股數', '成交價', '手續費', '交易稅'];
    const detected = detectBrokerTemplate(headers);
    expect(detected.id).toBe<BrokerTemplateId>('SINOPAC');
    expect(detected.name).toBe('永豐大戶投');
  });

  it('給予富邦證券表頭特徵，應精準識別為 FUBON', () => {
    const headers = ['成交日期', '市場', '股票代碼', '股票名稱', '買賣', '成交數量', '成交價格', '手續費', '證交稅'];
    const detected = detectBrokerTemplate(headers);
    expect(detected.id).toBe<BrokerTemplateId>('FUBON');
    expect(detected.name).toBe('富邦證券');
  });

  it('給予元大證券表頭特徵，應精準識別為 YUANTA', () => {
    const headers = ['日期', '帳號', '股號', '股名', '交易別', '股數', '單價', '價金', '手續費', '稅金'];
    const detected = detectBrokerTemplate(headers);
    expect(detected.id).toBe<BrokerTemplateId>('YUANTA');
    expect(detected.name).toBe('元大證券');
  });

  it('給予 Firstrade 表頭特徵，應精準識別為 FIRSTRADE', () => {
    const headers = ['TradeDate', 'Symbol', 'Action', 'Quantity', 'Price', 'Fee', 'Amount'];
    const detected = detectBrokerTemplate(headers);
    expect(detected.id).toBe<BrokerTemplateId>('FIRSTRADE');
    expect(detected.name).toBe('Firstrade (第一證券)');
  });

  it('給予 Charles Schwab 表頭特徵，應精準識別為 SCHWAB', () => {
    const headers = ['Date', 'Action', 'Symbol', 'Description', 'Quantity', 'Price', 'Fees & Comm', 'Amount'];
    const detected = detectBrokerTemplate(headers);
    expect(detected.id).toBe<BrokerTemplateId>('SCHWAB');
    expect(detected.name).toBe('Charles Schwab (嘉信)');
  });

  it('給予 Interactive Brokers 表頭特徵，應精準識別為 IBKR', () => {
    const headers = ['Date/Time', 'Symbol', 'Quantity', 'T. Price', 'Comm/Fee', 'Basis'];
    const detected = detectBrokerTemplate(headers);
    expect(detected.id).toBe<BrokerTemplateId>('IBKR');
    expect(detected.name).toBe('Interactive Brokers (IB)');
  });

  it('給予通用標準表頭特徵，應識別為 STANDARD', () => {
    const headers = ['日期', '市場', '代碼', '名稱', '類別', '股數', '單價', '手續費', '稅費', '幣別'];
    const detected = detectBrokerTemplate(headers);
    expect(detected.id).toBe<BrokerTemplateId>('STANDARD');
  });

  it('面對未知表頭特徵，應安全回退為 STANDARD 且具備有效映射', () => {
    const headers = ['未知欄位A', '未知欄位B', 'Custom123'];
    const detected = detectBrokerTemplate(headers);
    expect(detected.id).toBe<BrokerTemplateId>('STANDARD');
  });
});
