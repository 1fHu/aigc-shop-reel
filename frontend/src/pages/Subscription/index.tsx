import { t as translate, useLanguage } from '@/i18n';
import { useNavigate } from 'react-router-dom';
import { Button, Tag } from 'antd';
import {
  CrownOutlined,
  CheckOutlined,
  ArrowLeftOutlined,
  ToolOutlined,
} from '@ant-design/icons';

import styles from './Subscription.module.css';

interface Plan {
  key: string;
  name: string;
  price: string;
  period: string;
  highlight?: boolean;
  features: string[];
}



export default function SubscriptionPage() {
  useLanguage();
  const PLANS: Plan[] = [
    {
      key: 'free',
      name: translate("Free"),
      price: '¥0',
      period: translate("/ 月"),
      features: [translate("基础视频生成额度"), translate("标准模板"), translate("社区支持")],
    },
    {
      key: 'pro',
      name: 'Pro',
      price: '¥199',
      period: translate("/ 月"),
      highlight: true,
      features: [translate("更高生成额度"), translate("全部模板与素材库"), translate("高级剧本工坊"), translate("优先渲染队列")],
    },
    {
      key: 'team',
      name: translate("Team"),
      price: translate("联系我们"),
      period: '',
      features: [translate("多席位协作"), translate("专属客户成功"), translate("私有素材空间"), translate("API 接入")],
    },
  ];

  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>
            <CrownOutlined className={styles.titleIcon} />
            {translate("订阅与套餐")}
          </h1>
          <p className={styles.headerSubtitle}>{translate("选择适合你的方案,解锁更多创作能力")}</p>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          {translate("返回")}
        </Button>
      </div>

      <div className={styles.notice}>
        <ToolOutlined className={styles.noticeIcon} />
        <span>{translate("订阅功能正在施工中,以下方案与价格仅为占位展示,暂未开放购买。")}</span>
      </div>

      <div className={styles.plans}>
        {PLANS.map((plan) => (
          <div
            key={plan.key}
            className={`${styles.planCard} ${plan.highlight ? styles.planHighlight : ''}`}
          >
            {plan.highlight && <Tag color="gold" className={styles.popularTag}>{translate("推荐")}</Tag>}
            <div className={styles.planName}>{plan.name}</div>
            <div className={styles.planPrice}>
              <span className={styles.priceValue}>{plan.price}</span>
              {plan.period && <span className={styles.pricePeriod}>{plan.period}</span>}
            </div>
            <ul className={styles.featureList}>
              {plan.features.map((f) => (
                <li key={f}>
                  <CheckOutlined className={styles.featureIcon} />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              type={plan.highlight ? 'primary' : 'default'}
              block
              disabled
              className={styles.planButton}
            >
              {translate("即将开放")}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
