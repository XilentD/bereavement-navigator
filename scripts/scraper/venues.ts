/**
 * City venue registry — known stable URLs for government service information.
 * Each entry maps a city to its key institutional data sources.
 *
 * Priority tiers:
 *   Tier 1 — Official .gov.cn portals (most reliable, stable URLs)
 *   Tier 2 — 12345 knowledge base articles (semi-structured, often have full details)
 *   Tier 3 — Baidu Baike / Wikipedia (good for addresses/phones, less reliable for policy)
 *   Tier 4 — News articles / forum posts (last resort, needs heavy verification)
 */

export interface CityVenueSource {
  /** Human-readable label */
  label: string;
  /** URL to scrape */
  url: string;
  /** What data we expect to find here */
  extracts: ('funeral_home' | 'social_insurance' | 'notary' | 'property_center' | 'allowance')[];
  /** Known encoding (defaults to utf-8) */
  encoding?: 'utf-8' | 'gbk' | 'gb2312';
  /** CSS selectors to target content area (avoids nav/sidebar noise) */
  contentSelector?: string;
}

export interface CityRegistry {
  city: string;
  province: string;
  areaCode: string;
  hotline: string;
  sources: CityVenueSource[];
}

/**
 * National-level sources — apply to all cities
 */
const NATIONAL_SOURCES: CityVenueSource[] = [
  {
    label: '国家政务服务平台-殡葬服务',
    url: 'https://gjzwfw.www.gov.cn/col/col1298/index.html',
    extracts: ['funeral_home'],
    encoding: 'utf-8',
  },
  {
    label: '国家社会保险公共服务平台',
    url: 'https://si.12333.gov.cn/',
    extracts: ['social_insurance', 'allowance'],
    encoding: 'utf-8',
  },
];

/**
 * City-specific registries.
 * URLs verified as of 2026-06. Government sites occasionally restructure —
 * if a URL 404s, check the parent domain for the new path.
 */
export const CITY_REGISTRY: Record<string, CityRegistry> = {
  hangzhou: {
    city: 'hangzhou',
    province: '浙江',
    areaCode: '0571',
    hotline: '0571-12345',
    sources: [
      ...NATIONAL_SOURCES,
      {
        label: '杭州市民政局-殡葬服务',
        url: 'https://mzj.hangzhou.gov.cn/col/col1228928345/index.html',
        extracts: ['funeral_home'],
        encoding: 'gbk',
        contentSelector: '.article_content, .main-content, #content',
      },
      {
        label: '杭州市人力资源和社会保障局',
        url: 'https://hrss.hangzhou.gov.cn/',
        extracts: ['social_insurance', 'allowance'],
        encoding: 'gbk',
        contentSelector: '.article_content, .main-content',
      },
      {
        label: '杭州12345-殡葬服务指南',
        url: 'https://www.hangzhou.gov.cn/art/2024/1/15/art_1229518234_12345.html',
        extracts: ['funeral_home', 'allowance'],
        encoding: 'utf-8',
      },
      {
        label: '杭州市不动产登记中心',
        url: 'https://ghzy.hangzhou.gov.cn/col/col1228967429/index.html',
        extracts: ['property_center'],
        encoding: 'gbk',
      },
    ],
  },

  beijing: {
    city: 'beijing',
    province: '北京',
    areaCode: '010',
    hotline: '010-12345',
    sources: [
      ...NATIONAL_SOURCES,
      {
        label: '北京市民政局-殡葬管理',
        url: 'https://mzj.beijing.gov.cn/col/col2803/index.html',
        extracts: ['funeral_home'],
        encoding: 'gbk',
        contentSelector: '.article_content, .main-content',
      },
      {
        label: '北京市人力资源和社会保障局',
        url: 'https://rsj.beijing.gov.cn/',
        extracts: ['social_insurance', 'allowance'],
        encoding: 'gbk',
        contentSelector: '.article_content, .main-content',
      },
      {
        label: '北京市不动产登记中心',
        url: 'https://ghzrzyw.beijing.gov.cn/',
        extracts: ['property_center'],
        encoding: 'gbk',
      },
      {
        label: '北京市12345-丧葬补助金指南',
        url: 'https://www.beijing.gov.cn/hudong/bmfw/slbz/shbz/',
        extracts: ['allowance'],
        encoding: 'utf-8',
      },
    ],
  },

  shanghai: {
    city: 'shanghai',
    province: '上海',
    areaCode: '021',
    hotline: '021-12345',
    sources: [
      ...NATIONAL_SOURCES,
      {
        label: '上海市民政局-殡葬服务',
        url: 'https://mzj.sh.gov.cn/col/col41/index.html',
        extracts: ['funeral_home'],
        encoding: 'gbk',
        contentSelector: '.article_content, .main-content',
      },
      {
        label: '上海市人力资源和社会保障局',
        url: 'https://rsj.sh.gov.cn/',
        extracts: ['social_insurance', 'allowance'],
        encoding: 'gbk',
        contentSelector: '.article_content, .main-content',
      },
      {
        label: '上海市不动产登记中心',
        url: 'https://ghzyj.sh.gov.cn/bdcdj/',
        extracts: ['property_center'],
        encoding: 'gbk',
      },
      {
        label: '上海一网通办-身后事服务',
        url: 'https://zwdt.sh.gov.cn/govPortals/column/theme/shenhoushi.html',
        extracts: ['funeral_home', 'social_insurance', 'allowance'],
        encoding: 'utf-8',
      },
    ],
  },

  guangzhou: {
    city: 'guangzhou',
    province: '广东',
    areaCode: '020',
    hotline: '020-12345',
    sources: [
      ...NATIONAL_SOURCES,
      {
        label: '广州市民政局-殡葬管理',
        url: 'https://mzj.gz.gov.cn/',
        extracts: ['funeral_home'],
        encoding: 'gbk',
        contentSelector: '.article_content, .main-content',
      },
      {
        label: '广州市人力资源和社会保障局',
        url: 'https://rsj.gz.gov.cn/',
        extracts: ['social_insurance', 'allowance'],
        encoding: 'gbk',
        contentSelector: '.article_content, .main-content',
      },
      {
        label: '广州市不动产登记中心',
        url: 'https://ghzyj.gz.gov.cn/',
        extracts: ['property_center'],
        encoding: 'gbk',
      },
      {
        label: '粤省事-身后事一站式服务',
        url: 'https://yueshi.gd.gov.cn/',
        extracts: ['funeral_home', 'social_insurance', 'allowance'],
        encoding: 'utf-8',
      },
    ],
  },

  // Tier-2 cities — lighter source coverage, expand as needed
  shenzhen: {
    city: 'shenzhen',
    province: '广东',
    areaCode: '0755',
    hotline: '0755-12345',
    sources: [
      ...NATIONAL_SOURCES,
      {
        label: '深圳市民政局-殡葬服务',
        url: 'https://mzj.sz.gov.cn/',
        extracts: ['funeral_home'],
        encoding: 'gbk',
      },
      {
        label: '深圳市人力资源和社会保障局',
        url: 'https://hrss.sz.gov.cn/',
        extracts: ['social_insurance', 'allowance'],
        encoding: 'gbk',
      },
      {
        label: '深圳市不动产登记中心',
        url: 'https://www.szreorc.com/',
        extracts: ['property_center'],
        encoding: 'gbk',
      },
    ],
  },

  chengdu: {
    city: 'chengdu',
    province: '四川',
    areaCode: '028',
    hotline: '028-12345',
    sources: [
      ...NATIONAL_SOURCES,
      {
        label: '成都市民政局-殡葬服务',
        url: 'https://mzj.chengdu.gov.cn/',
        extracts: ['funeral_home'],
        encoding: 'gbk',
      },
      {
        label: '成都市人力资源和社会保障局',
        url: 'https://cdhrss.chengdu.gov.cn/',
        extracts: ['social_insurance', 'allowance'],
        encoding: 'gbk',
      },
      {
        label: '成都市不动产登记中心',
        url: 'https://mpnr.chengdu.gov.cn/',
        extracts: ['property_center'],
        encoding: 'gbk',
      },
    ],
  },

  wuhan: {
    city: 'wuhan',
    province: '湖北',
    areaCode: '027',
    hotline: '027-12345',
    sources: [
      ...NATIONAL_SOURCES,
      {
        label: '武汉市民政局-殡葬服务',
        url: 'https://mzj.wuhan.gov.cn/',
        extracts: ['funeral_home'],
        encoding: 'gbk',
      },
      {
        label: '武汉市人力资源和社会保障局',
        url: 'https://rsj.wuhan.gov.cn/',
        extracts: ['social_insurance', 'allowance'],
        encoding: 'gbk',
      },
      {
        label: '武汉市不动产登记中心',
        url: 'https://zrzyhgh.wuhan.gov.cn/',
        extracts: ['property_center'],
        encoding: 'gbk',
      },
    ],
  },
};
