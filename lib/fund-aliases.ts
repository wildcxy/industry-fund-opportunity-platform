export type KnownFundAlias = {
  code: string;
  displayName: string;
  searchQuery: string;
  theme: string;
  keywords: string[];
};

function normalizeName(value: string) {
  return value
    .replace(/\s+/g, "")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/发起式/g, "")
    .replace(/人民币/g, "")
    .toLowerCase();
}

export const knownPortfolioFundAliases: KnownFundAlias[] = [
  {
    code: "026478",
    displayName: "招商中证有色金属矿业主题ETF联接C",
    searchQuery: "招商中证有色金属矿业 ETF 联接 C",
    theme: "有色金属",
    keywords: ["招商中证有色金属矿业", "有色金属矿业主题ETF联接C"]
  },
  {
    code: "016874",
    displayName: "广发远见智选混合C",
    searchQuery: "广发远见智选混合C",
    theme: "自选基金",
    keywords: ["广发远见智选混合C", "广发远见智选"]
  },
  {
    code: "017524",
    displayName: "南方北证50成份指数发起C",
    searchQuery: "南方北证50",
    theme: "北证50",
    keywords: ["南方北证50成份指数C", "南方北证50"]
  },
  {
    code: "024239",
    displayName: "华夏全球科技先锋混合(QDII)C",
    searchQuery: "华夏全球科技先锋",
    theme: "海外科技",
    keywords: ["华夏全球科技先锋混合(QDII)C", "华夏全球科技先锋"]
  },
  {
    code: "025500",
    displayName: "东方阿尔法科技智选混合发起C",
    searchQuery: "东方阿尔法科技智选",
    theme: "科技成长",
    keywords: ["东方阿尔法科技智选混合C", "东方阿尔法科技智选"]
  },
  {
    code: "018147",
    displayName: "建信新兴市场混合(QDII)C",
    searchQuery: "建信新兴市场",
    theme: "新兴市场",
    keywords: ["建信新兴市场优选混合(QDII)C", "建信新兴市场"]
  },
  {
    code: "017731",
    displayName: "嘉实全球产业升级股票发起式(QDII)C",
    searchQuery: "嘉实全球产业升级",
    theme: "全球产业升级",
    keywords: ["嘉实全球产业升级股票(QDII)C", "嘉实全球产业升级"]
  },
  {
    code: "022328",
    displayName: "宏利高端装备股票C",
    searchQuery: "宏利高端装备股票C",
    theme: "高端装备",
    keywords: ["宏利高端装备股票C", "宏利高端装备"]
  },
  {
    code: "012922",
    displayName: "易方达全球成长精选混合(QDII)人民币C",
    searchQuery: "易方达全球成长",
    theme: "海外成长",
    keywords: ["易方达全球成长精选混合(QDII)C", "易方达全球成长"]
  },
  {
    code: "021662",
    displayName: "国富亚洲机会股票(QDII)C",
    searchQuery: "国富亚洲机会",
    theme: "亚洲机会",
    keywords: ["国富亚洲机会股票(QDII)C", "国富亚洲机会"]
  },
  {
    code: "020640",
    displayName: "广发半导体设备ETF联接C",
    searchQuery: "广发半导体",
    theme: "半导体",
    keywords: ["广发半导体材料设备主题ETF联接C", "广发半导体材料设备", "广发半导体设备"]
  },
  {
    code: "016702",
    displayName: "银华海外数字经济量化选股混合发起式(QDII)C",
    searchQuery: "银华海外数字经济",
    theme: "海外数字经济",
    keywords: ["银华海外数字经济量化选股混合C", "银华海外数字经济"]
  },
  {
    code: "016371",
    displayName: "信澳业绩驱动混合C",
    searchQuery: "信澳业绩驱动",
    theme: "主动成长",
    keywords: ["信澳业绩驱动混合C", "信澳业绩驱动"]
  },
  {
    code: "023408",
    displayName: "华宝创业板人工智能ETF发起式联接C",
    searchQuery: "华宝创业板人工智能",
    theme: "AI 算力基础设施",
    keywords: ["华宝创业板人工智能ETF联接C", "华宝创业板人工智能"]
  }
];

export function findKnownFundAlias(nameOrCode: string | undefined | null) {
  if (!nameOrCode) return undefined;
  const normalized = normalizeName(nameOrCode);
  return knownPortfolioFundAliases.find((alias) => {
    if (alias.code === nameOrCode.trim().padStart(6, "0")) return true;
    if (normalizeName(alias.displayName) === normalized) return true;
    return alias.keywords.some((keyword) => {
      const normalizedKeyword = normalizeName(keyword);
      return normalized.includes(normalizedKeyword) || normalizedKeyword.includes(normalized);
    });
  });
}
