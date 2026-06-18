-- Create posts, comments and favorites tables for ZHIYIN aggregation platform

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  score INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Insert sample high-popularity posts from various platforms
INSERT OR IGNORE INTO posts (id, title, url, source, category, description, score, clicks, created_at)
VALUES 
('post-1', '为什么现在的年轻人都不愿意生小孩了？知乎热议', 'https://www.zhihu.com/question/437937402', '知乎', '社会', '关于当代青年生育观、生活压力与社会保障的多角度深入讨论，吸引了数千条精彩回答。', 9520, 3200, '2026-06-18T10:00:00Z'),

('post-2', 'V2EX: 记录一下自己 35 岁被裁员后的心路历程与重新出发', 'https://www.v2ex.com/t/999999', 'V2EX', '职场', '一位资深程序员分享自己在面临行业寒冬与中年危机时，如何通过学习新技能与心态调整走出阴霾的真实故事。', 8840, 2450, '2026-06-18T09:30:00Z'),

('post-3', '掘金: 2026年了，前端开发还有出路吗？聊聊大模型时代的Web演进', 'https://juejin.cn/post/88888888', '掘金', '技术', '随着 AI Agent 和前端智能化工具的兴起，传统前端的角色正在发生剧烈改变。本文深度探讨未来的前端演进方向。', 7890, 1980, '2026-06-18T08:15:00Z'),

('post-4', '微博热搜: #2026高考志愿填报指南# 避坑与热门专业解析', 'https://weibo.com/hot/gaokao2026', '微博', '资讯', '高考刚刚结束，各大高校及专业报考指南成为焦点。张雪峰等名师的最新专业解析合集。', 12050, 5600, '2026-06-18T11:20:00Z'),

('post-5', 'Reddit: GPT-5 (Orion) 深度体验报告与未来多模态展望', 'https://www.reddit.com/r/technology/comments/gpt5', 'Reddit', '技术', '来自科技社区的首发评测，探讨新一代推理模型在复杂数学、编程和逻辑推理方面的跨越式提升。', 6700, 1100, '2026-06-18T07:45:00Z'),

('post-6', '少数派: 如何利用 Notion + Raycast 打造个人的无缝知识管理第二大脑', 'https://sspai.com/post/95000', '少数派', '效率', '超详细的效率工具配置指南。教你如何用最少的步骤捕获灵感、整理笔记、构建自动化工作流。', 5400, 890, '2026-06-18T06:30:00Z'),

('post-7', '36氪: 独家对话中国商业航天新势力：我们要把卫星发射成本再降90%', 'https://36kr.com/p/23456789', '36氪', '商业', '低轨卫星互联网星座正在迎来爆发，国内商业航天企业如何在全球商业竞争中分得一杯羹？', 4320, 750, '2026-06-18T05:20:00Z'),

('post-8', '知乎: 历史上有什么惊艳了你很久的诗词或句子？', 'https://www.zhihu.com/question/28903347', '知乎', '人文', '传统文学的魅力在当代网络下的回响，分享那些一眼万年、字字珠玑的诗词佳句。', 8900, 3100, '2026-06-17T15:00:00Z'),

('post-9', 'V2EX: 独立开发三年，我的 Saas 产品终于实现了月入万刀', 'https://www.v2ex.com/t/888888', 'V2EX', '创意', '作者详细分享了从产品定位、MVP开发、海外推广到定价策略的全部避坑指南，极其硬核。', 9310, 2100, '2026-06-17T12:00:00Z'),

('post-10', '掘金: 尤雨溪最新专访：前端框架的终局与 Web 平台的未来', 'https://juejin.cn/post/77777777', '掘金', '技术', 'Vue.js 作者深度探讨 Signals 机制、原生 ESM 的发展，以及为什么现代框架正变得越来越趋同。', 8120, 2300, '2026-06-17T08:00:00Z');
