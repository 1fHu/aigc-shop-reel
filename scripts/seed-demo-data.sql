-- VidCraft Demo Seed Data
-- Provides pre-populated content for the tourist/demo experience. encoding from 火山引擎 API

-- ============================================================
-- Demo User (password: demo1234, bcrypt placeholder)
-- ============================================================
INSERT INTO users (id, email, password_hash, nickname, plan_type, video_quota)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'demo@vidcraft.io',
    '$2b$10$placeholder_demo_hash_replace_with_real_bcrypt',
    '演示商家',
    'free',
    3
);

-- ============================================================
-- Demo Projects (2)
-- ============================================================
INSERT INTO projects (id, user_id, name, description, product_info, status)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    '美白精华液推广',
    '夏季美白精华液 TikTok 带货视频',
    '{"品名":"雪肌透光亮肤精华液","品类":"美妆护肤","核心卖点":["28天淡化黑色素","烟酰胺+维C双重美白","清爽不粘腻","敏感肌可用"],"目标人群":"25-35岁都市女性","使用场景":"早晚洁面后使用","价格锚点":"¥129"}',
    'active'
);

INSERT INTO projects (id, user_id, name, description, product_info, status)
VALUES (
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    '无线降噪耳机',
    '性价比降噪耳机种草视频',
    '{"品名":"漫步声Nova Pro无线降噪耳机","品类":"3C数码","核心卖点":["-45dB主动降噪","40小时超长续航","Hi-Res金标认证","仅重220g"],"目标人群":"18-35岁通勤族和学生","使用场景":"地铁通勤/图书馆/健身房","价格锚点":"¥299"}',
    'active'
);

-- ============================================================
-- Demo Scripts (3 - different styles)
-- ============================================================

-- Script 1: 痛点共鸣型 - 美白精华液
INSERT INTO scripts (id, project_id, strategy_type, content, storyboard, factor_history, status)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    '痛点共鸣型',
    '夏天来了，你的美白精华液真的有效吗？28天见证透亮变化...',
    '[
        {"shot_index":1,"description":"暗沉肤色特写，展示肌肤暗沉问题","camera":"微距推近","duration":3,"narration":"你是不是也试过无数美白精华，肤色还是暗沉？","subtitles":"暗沉困扰？"},
        {"shot_index":2,"description":"产品展示，旋转瓶身突出设计质感","camera":"产品旋转特写","duration":3,"narration":"雪肌透光亮肤精华液，烟酰胺+维C双重美白","subtitles":"烟酰胺+维C双重美白"},
        {"shot_index":3,"description":"质地展示，滴管吸取精华液","camera":"微距特写","duration":3,"narration":"清爽水润质地，一抹化水，不粘腻","subtitles":"清爽一抹化水"},
        {"shot_index":4,"description":"模特使用场景，早晚涂抹","camera":"中景跟拍","duration":3,"narration":"28天淡化黑色素，重现透亮肌肤","subtitles":"28天见证改变"},
        {"shot_index":5,"description":"前后对比+CTA","camera":"分屏对比","duration":3,"narration":"点击购物车，这个夏天白成一道光","subtitles":"点击购物车立即购买"}
    ]',
    '[]',
    'completed'
);

-- Script 2: 产品测评型 - 美白精华液 (same product, different angle)
INSERT INTO scripts (id, project_id, strategy_type, content, storyboard, factor_history, status)
VALUES (
    'c0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    '产品测评型',
    '实测28天！这款百元美白精华到底有没有用？全程记录...',
    '[
        {"shot_index":1,"description":"开箱测评开场，桌面摆满产品","camera":"俯拍桌面","duration":3,"narration":"今天来实测这款风很大的雪肌透光亮肤精华液","subtitles":"实测28天美白精华"},
        {"shot_index":2,"description":"成分表展示与分析","camera":"特写成分表","duration":3,"narration":"烟酰胺浓度5%，搭配VC衍生物，成分党狂喜","subtitles":"5%烟酰胺+VC衍生物"},
        {"shot_index":3,"description":"Day 1 vs Day 14 肤色对比","camera":"分屏对比","duration":3,"narration":"连续使用14天，肤色已经有明显提亮","subtitles":"14天肤色提亮对比"},
        {"shot_index":4,"description":"Day 28 最终效果展示","camera":"柔光特写","duration":3,"narration":"28天！痘印淡了，肤色均匀了，这效果我服","subtitles":"痘印淡化肤色均匀"},
        {"shot_index":5,"description":"总结+性价比分析+CTA","camera":"中景口播","duration":3,"narration":"百元价位做到这个效果，性价比真的绝了，闭眼入","subtitles":"百元美白精华性价比之王"}
    ]',
    '[]',
    'completed'
);

-- Script 3: 情感故事型 - 无线降噪耳机
INSERT INTO scripts (id, project_id, strategy_type, content, storyboard, factor_history, status)
VALUES (
    'c0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000002',
    '情感故事型',
    '通勤路上，给自己一个安静的世界。漫步声Nova Pro...',
    '[
        {"shot_index":1,"description":"拥挤地铁车厢，主角戴上耳机","camera":"跟拍中景","duration":3,"narration":"每天通勤2小时，这是我给自己打造的小世界","subtitles":"给你一个安静的世界"},
        {"shot_index":2,"description":"切换场景到安静空间，展示降噪效果","camera":"场景跳切","duration":3,"narration":"一键开启降噪，-45dB，车厢噪音瞬间消失","subtitles":"-45dB主动降噪"},
        {"shot_index":3,"description":"产品特写旋转","camera":"产品旋转特写","duration":3,"narration":"Hi-Res金标认证，每个音符都清晰入耳","subtitles":"Hi-Res金标音质"},
        {"shot_index":4,"description":"不同场景使用：通勤/图书馆/健身房","camera":"快切蒙太奇","duration":3,"narration":"40小时续航，一周通勤不充电","subtitles":"40小时超长续航"},
        {"shot_index":5,"description":"价格标签弹出+CTA","camera":"定格动画","duration":3,"narration":"只要299，给自己一份安静的礼物","subtitles":"¥299 立刻拥有"}
    ]',
    '[
        {"dimension":"视觉风格","old_value":"黑风极简","new_value":"轻奢质感风","timestamp":"2025-05-21T10:00:00Z"},
        {"dimension":"开场手法","old_value":"问题式Hook","new_value":"悬念式Hook","timestamp":"2025-05-21T10:05:00Z"}
    ]',
    'completed'
);

-- ============================================================
-- Demo Video (1)
-- ============================================================
INSERT INTO videos (id, project_id, script_id, video_url, duration, resolution, status, trace_id)
VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'https://minio.local/demo/videos/skincare-demo.mp4',
    15.0,
    '1080P',
    'completed',
    'trace-demo-00000000001'
);

-- Demo video tasks
INSERT INTO video_tasks (video_id, shot_index, seedance_task_id, status, trace_id)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 1, 'sd-task-demo-001', 'completed', 'trace-demo-00000000001'),
    ('d0000000-0000-0000-0000-000000000001', 2, 'sd-task-demo-002', 'completed', 'trace-demo-00000000001'),
    ('d0000000-0000-0000-0000-000000000001', 3, 'sd-task-demo-003', 'completed', 'trace-demo-00000000001'),
    ('d0000000-0000-0000-0000-000000000001', 4, 'sd-task-demo-004', 'completed', 'trace-demo-00000000001'),
    ('d0000000-0000-0000-0000-000000000001', 5, 'sd-task-demo-005', 'completed', 'trace-demo-00000000001');

-- ============================================================
-- Video Metrics (2 videos - one good, one needs optimization)
-- ============================================================
INSERT INTO video_metrics (video_id, views, completion_rate, click_rate, conversion_rate, gmv, watch_time_distribution)
VALUES (
    'd0000000-0000-0000-0000-000000000001',
    28450,
    0.35,
    0.052,
    0.018,
    18520.50,
    '{"0_3s":0.85,"3_6s":0.62,"6_9s":0.45,"9_12s":0.35,"12_15s":0.35}'
);

-- Second demo video (low conversion - triggers diagnosis)
INSERT INTO videos (id, project_id, script_id, video_url, duration, resolution, status, trace_id)
VALUES (
    'd0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000002',
    'https://minio.local/demo/videos/skincare-review.mp4',
    15.0,
    '1080P',
    'completed',
    'trace-demo-00000000002'
);

INSERT INTO video_metrics (video_id, views, completion_rate, click_rate, conversion_rate, gmv, watch_time_distribution)
VALUES (
    'd0000000-0000-0000-0000-000000000002',
    42310,
    0.22,
    0.031,
    0.008,
    6240.00,
    '{"0_3s":0.78,"3_6s":0.51,"6_9s":0.33,"9_12s":0.24,"12_15s":0.22}'
);

-- ============================================================
-- Diagnosis Report (for low-conversion video)
-- ============================================================
INSERT INTO diagnosis_reports (video_id, issues, suggestions)
VALUES (
    'd0000000-0000-0000-0000-000000000002',
    '[
        {"scene_index":0,"issue_type":"hook_weak","severity":"high","description":"前3秒留存率仅78%，Hook吸引力不足，未在第一时间抓住目标用户注意力"},
        {"scene_index":2,"issue_type":"drop_off","severity":"medium","description":"6-9秒区间流失率高达18%，成分展示过于专业，普通用户理解门槛高"},
        {"scene_index":4,"issue_type":"cta_weak","severity":"medium","description":"CTA缺乏紧迫感，从完播到点击的转化率仅3.1%，缺少限时优惠或利益点刺激"}
    ]',
    '[
        {"scene_index":0,"optimized_prompt":"特写肤色暗沉+大字幕弹出「你用的美白精华可能根本没用」，制造认知冲突"},
        {"scene_index":2,"optimized_prompt":"成分展示改为直观的动画对比图（使用前 vs 使用后），标注「14天肉眼可见」替代专业术语"},
        {"scene_index":4,"optimized_prompt":"结尾增加「限时优惠¥99 | 前100名送试用装」+ 倒计时动效，提升紧迫感"}
    ]'
);

-- ============================================================
-- Factor Definitions (5 dimensions x multiple values each)
-- ============================================================
INSERT INTO factor_definitions (dimension, values, description)
VALUES
    ('视觉风格', '["黑风极简","夏日度假风","赛博科技风","轻奢质感风","清新自然风","复古胶片风","高级ins风","温柔奶油风"]', '控制画面整体色调、构图偏好与视觉氛围'),
    ('开场手法', '["问题式Hook","价格锚点Hook","悬念式Hook","数据震撼Hook","对比式Hook","情感共鸣Hook","反常识Hook","明星同款Hook"]', '控制视频前3秒的吸引力方式'),
    ('旁白风格', '["优雅知性","活泼种草","专业测评","亲切日常","温柔故事感","激情带货","幽默段子手"]', '控制配音文案的语气、措辞与表达节奏'),
    ('节奏密度', '["快切节奏（0.5-1s/镜）","中速（1-2s/镜）","慢镜强调（2-3s/镜）","变速节奏（混合）"]', '控制分镜时长分配策略与视频整体节奏感'),
    ('CTA形式', '["立即下单","点击购物车","限时优惠","品牌心智","免费试用","悬念引导","从众效应"]', '控制结尾行动号召的方式与转化策略');

-- ============================================================
-- Viral Genes (30 entries - 6 per category)
-- ============================================================
INSERT INTO viral_genes (category, storyboard_structure, performance_score) VALUES
-- 美妆 (6)
('美妆', '{"hook":"问题式暗沉痛点","structure":["暗沉展示","产品特写","质地体验","效果对比","CTA限时促单"],"avg_duration":15,"key_factors":{"视觉风格":"轻奢质感风","开场手法":"问题式Hook","节奏密度":"中速"}}', 0.87),
('美妆', '{"hook":"28天打卡记录","structure":["Day1记录","Day7变化","Day14对比","Day28成果","产品推荐"],"avg_duration":15,"key_factors":{"视觉风格":"清新自然风","开场手法":"悬念式Hook","节奏密度":"变速节奏"}}', 0.82),
('美妆', '{"hook":"成分党硬核测评","structure":["成分表展示","实验测试","真人试用","数据对比","购买链接"],"avg_duration":15,"key_factors":{"视觉风格":"黑风极简","开场手法":"数据震撼Hook","节奏密度":"中速"}}', 0.79),
('美妆', '{"hook":"素人改造前后","structure":["素人状态","产品使用过程","即时效果","一周后回访","同款链接"],"avg_duration":15,"key_factors":{"视觉风格":"温柔奶油风","开场手法":"对比式Hook","节奏密度":"慢镜强调"}}', 0.91),
('美妆', '{"hook":"明星化妆师推荐","structure":["化妆师出镜","专业分析","上妆演示","妆效展示","品牌推荐"],"avg_duration":15,"key_factors":{"视觉风格":"高级ins风","开场手法":"明星同款Hook","节奏密度":"中速"}}', 0.84),
('美妆', '{"hook":"百元vs千元对比","structure":["两款产品并列","成分对比","质地对比","效果盲测","性价比结论"],"avg_duration":15,"key_factors":{"视觉风格":"黑风极简","开场手法":"对比式Hook","节奏密度":"快切节奏"}}', 0.88),

-- 服装 (6)
('服装', '{"hook":"一周穿搭挑战","structure":["周一至周日快切","每套单品特写","搭配技巧","上身效果","同款链接"],"avg_duration":15,"key_factors":{"视觉风格":"清新自然风","开场手法":"悬念式Hook","节奏密度":"快切节奏"}}', 0.86),
('服装', '{"hook":"梨形身材救星","structure":["身材痛点","穿搭误区","正确示范","多套对比","尺码推荐"],"avg_duration":15,"key_factors":{"视觉风格":"温柔奶油风","开场手法":"问题式Hook","节奏密度":"中速"}}', 0.83),
('服装', '{"hook":"明星同款平替","structure":["明星街拍展示","平替单品","细节对比","穿搭效果","价格对比"],"avg_duration":15,"key_factors":{"视觉风格":"高级ins风","开场手法":"明星同款Hook","节奏密度":"中速"}}', 0.89),
('服装', '{"hook":"胶囊衣橱搭配","structure":["5件单品展示","10套搭配","场景切换","搭配公式","单品链接"],"avg_duration":15,"key_factors":{"视觉风格":"轻奢质感风","开场手法":"悬念式Hook","节奏密度":"快切节奏"}}', 0.81),
('服装', '{"hook":"试穿100件选出TOP3","structure":["试穿过程快剪","TOP3揭晓","细节讲解","上身对比","购买建议"],"avg_duration":15,"key_factors":{"视觉风格":"清新自然风","开场手法":"数据震撼Hook","节奏密度":"快切节奏"}}', 0.92),
('服装', '{"hook":"小个子显高秘籍","structure":["身高自曝","显矮穿搭雷区","显高搭配","视觉对比","单品推荐"],"avg_duration":15,"key_factors":{"视觉风格":"温柔奶油风","开场手法":"问题式Hook","节奏密度":"中速"}}', 0.85),

-- 家居 (6)
('家居', '{"hook":"出租屋改造前后","structure":["改造前全貌","问题分析","改造过程","前后对比","好物清单"],"avg_duration":15,"key_factors":{"视觉风格":"清新自然风","开场手法":"对比式Hook","节奏密度":"变速节奏"}}', 0.90),
('家居', '{"hook":"沉浸式Room Tour","structure":["进门视角","各区域展示","收纳细节","氛围灯光","好物链接"],"avg_duration":15,"key_factors":{"视觉风格":"轻奢质感风","开场手法":"悬念式Hook","节奏密度":"慢镜强调"}}', 0.84),
('家居', '{"hook":"10元搞定收纳","structure":["收纳痛点","神器展示","使用对比","多场景应用","购买链接"],"avg_duration":15,"key_factors":{"视觉风格":"黑风极简","开场手法":"价格锚点Hook","节奏密度":"快切节奏"}}', 0.82),
('家居', '{"hook":"独居女生安全好物","structure":["安全焦虑","产品演示","实测效果","多设备联动","购买建议"],"avg_duration":15,"key_factors":{"视觉风格":"温柔奶油风","开场手法":"问题式Hook","节奏密度":"中速"}}', 0.78),
('家居', '{"hook":"跟着ins博主布置家","structure":["博主原图展示","同款单品","布置过程","成品对比","同款链接"],"avg_duration":15,"key_factors":{"视觉风格":"高级ins风","开场手法":"明星同款Hook","节奏密度":"中速"}}', 0.86),
('家居', '{"hook":"懒人清洁神器合集","structure":["清洁痛点","神器逐一亮相","使用演示","清洁前后","优惠链接"],"avg_duration":15,"key_factors":{"视觉风格":"清新自然风","开场手法":"问题式Hook","节奏密度":"快切节奏"}}', 0.80),

-- 3C数码 (6)
('3C数码', '{"hook":"百元vs千元耳机盲测","structure":["盲测规则说明","三款耳机试听","猜价格","揭晓答案","性价比分析"],"avg_duration":15,"key_factors":{"视觉风格":"黑风极简","开场手法":"悬念式Hook","节奏密度":"中速"}}', 0.88),
('3C数码', '{"hook":"学生党必备数码三件套","structure":["使用场景展示","产品逐一介绍","功能演示","预算合计","购买链接"],"avg_duration":15,"key_factors":{"视觉风格":"赛博科技风","开场手法":"悬念式Hook","节奏密度":"快切节奏"}}', 0.83),
('3C数码', '{"hook":"手机摄影技巧","structure":["拍摄痛点","设置调整","实拍演示","样张对比","设备推荐"],"avg_duration":15,"key_factors":{"视觉风格":"黑风极简","开场手法":"问题式Hook","节奏密度":"中速"}}', 0.85),
('3C数码', '{"hook":"数码产品红黑榜","structure":["红榜产品","黑榜避雷","对比分析","选购建议","购买链接"],"avg_duration":15,"key_factors":{"视觉风格":"赛博科技风","开场手法":"反常识Hook","节奏密度":"快切节奏"}}', 0.91),
('3C数码', '{"hook":"桌面改造计划","structure":["改造前桌面","设备清单","布置过程","成品展示","设备链接"],"avg_duration":15,"key_factors":{"视觉风格":"赛博科技风","开场手法":"对比式Hook","节奏密度":"变速节奏"}}', 0.79),
('3C数码', '{"hook":"通勤神器推荐","structure":["通勤场景","痛点描述","神器演示","实测数据","购买建议"],"avg_duration":15,"key_factors":{"视觉风格":"轻奢质感风","开场手法":"情感共鸣Hook","节奏密度":"中速"}}', 0.82),

-- 食品 (6)
('食品', '{"hook":"办公室零食开箱","structure":["零食堆展示","逐一试吃","真实反应","红黑榜","购买链接"],"avg_duration":15,"key_factors":{"视觉风格":"清新自然风","开场手法":"悬念式Hook","节奏密度":"快切节奏"}}', 0.87),
('食品', '{"hook":"减脂期也能吃的零食","structure":["减脂困扰","热量对比","零食推荐","营养成分分析","购买链接"],"avg_duration":15,"key_factors":{"视觉风格":"温柔奶油风","开场手法":"问题式Hook","节奏密度":"中速"}}', 0.84),
('食品', '{"hook":"1分钟懒人早餐","structure":["早晨匆忙场景","食材准备","制作过程","成品展示","食材链接"],"avg_duration":15,"key_factors":{"视觉风格":"清新自然风","开场手法":"问题式Hook","节奏密度":"快切节奏"}}', 0.81),
('食品', '{"hook":"网红零食真实测评","structure":["零食开箱","逐一评测","意外发现","总结推荐","购买链接"],"avg_duration":15,"key_factors":{"视觉风格":"高级ins风","开场手法":"悬念式Hook","节奏密度":"快切节奏"}}', 0.88),
('食品', '{"hook":"便利店隐藏吃法","structure":["便利店场景","食材组合","制作演示","试吃评价","复刻配方"],"avg_duration":15,"key_factors":{"视觉风格":"活泼种草","开场手法":"反常识Hook","节奏密度":"快切节奏"}}', 0.93),
('食品', '{"hook":"月薪3000也能天天吃","structure":["预算展示","采购清单","一周备菜","每日餐食","成本合计"],"avg_duration":15,"key_factors":{"视觉风格":"清新自然风","开场手法":"价格锚点Hook","节奏密度":"中速"}}', 0.86);

-- ============================================================
-- Viral Library (5 example entries)
-- ============================================================
INSERT INTO viral_library (source_url, platform, title, analysis_report, status)
VALUES
    ('https://www.tiktok.com/@beautycreator/video/example001', 'TikTok', '28天美白精华实测爆款视频',
     '{"hook_type":"问题式Hook","hook_description":"开头直接展示暗沉肤色的真实状态引发共鸣","shot_count":5,"rhythm":"中速1-2s/镜","style_tags":["轻奢质感","真实测评"],"cta_type":"限时优惠","cta_position":"末尾5秒","estimated_performance_score":0.92,"key_learnings":["真实使用过程建立信任","分屏对比是最强说服力","限时优惠制造紧迫感"]}',
     'completed'),
    ('https://www.youtube.com/watch?v=example002', 'YouTube', '2025最值得买的降噪耳机横评',
     '{"hook_type":"数据震撼Hook","hook_description":"用分贝仪实测数据开场建立专业感","shot_count":6,"rhythm":"中速1-2s/镜","style_tags":["黑风极简","硬核测评"],"cta_type":"品牌心智","cta_position":"末尾3秒","estimated_performance_score":0.88,"key_learnings":["实测数据比主观感受更有说服力","多场景演示覆盖更广用户群","价格锚点制造性价比感知"]}',
     'completed'),
    ('https://www.tiktok.com/@fashionista/video/example003', 'TikTok', '梨形身材一周穿搭不重样',
     '{"hook_type":"问题式Hook","hook_description":"直接点出梨形身材穿搭痛点引发目标用户共鸣","shot_count":7,"rhythm":"快切0.5-1s/镜","style_tags":["清新自然","实用穿搭"],"cta_type":"购物车","cta_position":"末尾2秒","estimated_performance_score":0.94,"key_learnings":["精准人群定位提高转化","快节奏展示增加完播率","每套搭配都标注单品信息方便购买"]}',
     'completed'),
    ('https://www.instagram.com/p/example004', 'Instagram', '独居女生租房改造前后对比',
     '{"hook_type":"对比式Hook","hook_description":"改造前后的强烈反差制造视觉冲击","shot_count":5,"rhythm":"变速节奏","style_tags":["温柔奶油","沉浸式"],"cta_type":"从众效应","cta_position":"末尾4秒","estimated_performance_score":0.90,"key_learnings":["改造前后对比是最强视觉钩子","好物清单增加收藏和转发","温馨氛围感提升品牌好感度"]}',
     'completed'),
    ('https://www.tiktok.com/@foodie/video/example005', 'TikTok', '便利店10元搞定一顿减脂餐',
     '{"hook_type":"价格锚点Hook","hook_description":"先用10元预算吸引价格敏感用户","shot_count":4,"rhythm":"快切0.5-1s/镜","style_tags":["活泼种草","接地气"],"cta_type":"限时优惠","cta_position":"末尾3秒","estimated_performance_score":0.91,"key_learnings":["极低预算引发广泛传播","便利店场景人人都能复刻","快节奏剪辑适配食品类内容"]}',
     'completed');
