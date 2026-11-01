import { translateText } from './translate';
import { useLanguageStore } from '../stores/languageStore';

/** Only known read-only demo fields may be localized. Editable and user content stays raw. */
const demoFields: Record<string, readonly string[]> = {
  "dashboard": [
    "智能家居类目"
  ],
  "video-001": [
    "Hook 时长过长导致前 3 秒流失",
    "Hook 时长 4.2s，与平均水平 1.5s 相比偏长，导致前 3 秒流失率 41%（平均 22%）。建议压缩 Hook 时长，用单帧大特写定开场。",
    "缩短 Hook 至 1.5 秒以内",
    "用单色背景 + 产品大特写 + 重低音 sting，将开场从 4.2s 压缩至 1.5s 以内。",
    "3-5 秒处加入对比帧",
    "在第 3-5 秒插入「使用前 vs 使用后」对比画面，强化产品差异化认知，提升中段留存。",
    "结尾增加 GMV CTA 卡",
    "在最后 2-3 秒加入价格锚点 + 限时折扣信息卡，触发更明确的下单引导。"
  ],
  "ref-video-001": [
    "电影级美妆产品展示"
  ],
  "ref-video-002": [
    "痛点共鸣型家居好物"
  ],
  "ref-video-003": [
    "悬念式开箱科技产品"
  ],
  "ref-video-004": [
    "故事化减肥产品"
  ],
  "ref-video-005": [
    "反差对比服饰穿搭"
  ],
  "ref-video-006": [
    "场景化厨房小家电"
  ],
  "ref-video-007": [
    "极简风母婴产品"
  ],
  "ref-video-008": [
    "高能剪辑零食测评"
  ]
};

export function demoText(id: string, source: string): string {
  return demoFields[id]?.includes(source) ? translateText(source, useLanguageStore.getState().language) : source;
}
