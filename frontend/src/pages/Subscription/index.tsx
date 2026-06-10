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

const PLANS: Plan[] = [
  {
    key: 'free',
    name: 'Free',
    price: '¥0',
    period: '/ 月',
    features: ['基础视频生成额度', '标准模板', '社区支持'],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '¥199',
    period: '/ 月',
    highlight: true,
    features: ['更高生成额度', '全部模板与素材库', '高级剧本工坊', '优先渲染队列'],
  },
  {
    key: 'team',
    name: 'Team',
    price: '联系我们',
    period: '',
    features: ['多席位协作', '专属客户成功', '私有素材空间', 'API 接入'],
  },
];

export default function SubscriptionPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>
            <CrownOutlined className={styles.titleIcon} />
            订阅与套餐
          </h1>
          <p className={styles.headerSubtitle}>选择适合你的方案,解锁更多创作能力</p>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
      </div>

      <div className={styles.notice}>
        <ToolOutlined className={styles.noticeIcon} />
        <span>订阅功能正在施工中,以下方案与价格仅为占位展示,暂未开放购买。</span>
      </div>

      <div className={styles.plans}>
        {PLANS.map((plan) => (
          <div
            key={plan.key}
            className={`${styles.planCard} ${plan.highlight ? styles.planHighlight : ''}`}
          >
            {plan.highlight && <Tag color="gold" className={styles.popularTag}>推荐</Tag>}
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
              即将开放
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
