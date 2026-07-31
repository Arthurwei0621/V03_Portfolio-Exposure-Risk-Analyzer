export interface AssetItem {
  id: string;
  name: string;
  ticker?: string;
  category: string;
  value: number; // 總資產價值
  cost?: number;  // 買入成本 (可選)
  shares?: number; // 股數 (可選)
  price?: number;  // 單價 (可選)
  leverage: number; // 槓桿倍數 (例如：1 代表一般現股, 2 代表兩倍槓桿, -1 代表反向)
  notes?: string;
}

export interface Portfolio {
  id: string;
  name: string;
  assets: AssetItem[];
  baseCurrency: string;
  targetExposure?: Record<string, number>; // 各類別的目標佔比 (%)
}

export const ASSET_CATEGORIES = [
  "科技資訊 (Technology)",
  "金融保險 (Finance)",
  "半導體 (Semiconductor)",
  "ETF / 基金 (ETF/Fund)",
  "民生消費 (Consumer)",
  "生技醫療 (Healthcare)",
  "能源與材料 (Energy/Materials)",
  "航運與航太 (Shipping/Aerospace)",
  "現金與等價物 (Cash & Equivalents)",
  "其他資產 (Others)"
] as const;

export type AssetCategory = typeof ASSET_CATEGORIES[number];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  TWD: "NT$",
  USD: "$",
  EUR: "€",
  JPY: "¥",
  CNY: "¥",
};
