import styles from "./GroceryStore.module.css";
function GroceryStore({ bottom, left }) {
  const customStyle = {};
  if (bottom !== void 0) customStyle.bottom = bottom;
  if (left !== void 0) {
    customStyle.left = left;
    customStyle.transform = "none";
  }
  return <div className={styles.wrapper} style={customStyle}>
      <svg
    width="220"
    height="220"
    viewBox="0 0 300 300"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={styles.storeSvg}
  >
        <defs>
          {
    /* 墙体渐变 (木质或石灰墙) */
  }
          <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3d4a5d" />
            <stop offset="100%" stopColor="#1f2633" />
          </linearGradient>

          {
    /* 屋顶渐变 */
  }
          <linearGradient id="roofGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4a5568" />
            <stop offset="50%" stopColor="#2d3748" />
            <stop offset="100%" stopColor="#1a202c" />
          </linearGradient>

          {
    /* 侧墙阴影渐变 */
  }
          <linearGradient id="sideWallShadow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#111622" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#111622" stopOpacity="0" />
          </linearGradient>

          {
    /* 遮阳棚红色条纹渐变 */
  }
          <linearGradient id="awningRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff4d4d" />
            <stop offset="30%" stopColor="#e53e3e" />
            <stop offset="100%" stopColor="#9b1c1c" />
          </linearGradient>

          {
    /* 遮阳棚白色条纹渐变 */
  }
          <linearGradient id="awningWhite" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#edf2f7" />
            <stop offset="100%" stopColor="#cbd5e0" />
          </linearGradient>

          {
    /* 遮阳棚投影 */
  }
          <linearGradient id="awningShadow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </linearGradient>

          {
    /* 室内暖色灯光径向渐变 */
  }
          <radialGradient id="indoorLight" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="50%" stopColor="#fef08a" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ca8a04" stopOpacity="0.1" />
          </radialGradient>

          {
    /* 窗户玻璃反光渐变 */
  }
          <linearGradient id="glassReflection" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="30%" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="31%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {
    /* 门木纹渐变 */
  }
          <linearGradient id="doorWood" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8a4b18" />
            <stop offset="50%" stopColor="#a05a2c" />
            <stop offset="100%" stopColor="#743d10" />
          </linearGradient>

          {
    /* 门玻璃磨砂渐变 */
  }
          <linearGradient id="doorGlass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.4" />
          </linearGradient>

          {
    /* 射灯发出的光芒径向渐变 */
  }
          <radialGradient id="lampGlow" cx="50%" cy="0%" r="80%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#fef08a" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
          </radialGradient>

          {
    /* 地板/台阶渐变 */
  }
          <linearGradient id="stepGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#718096" />
            <stop offset="100%" stopColor="#4a5568" />
          </linearGradient>

          {
    /* 仿石板路渐变 */
  }
          <linearGradient id="stoneGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4a5568" />
            <stop offset="50%" stopColor="#718096" />
            <stop offset="100%" stopColor="#2d3748" />
          </linearGradient>

          {
    /* 水果渐变：红苹果 */
  }
          <radialGradient id="appleGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="70%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </radialGradient>

          {
    /* 水果渐变：橙子 */
  }
          <radialGradient id="orangeGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="70%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#c2410c" />
          </radialGradient>

          {
    /* 绿植叶子渐变 */
  }
          <linearGradient id="leafGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>

          {
    /* 花盆渐变 */
  }
          <linearGradient id="potGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          {
    /* 阴影滤镜，使元素具备真实的软阴影 */
  }
          <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
          </filter>

          <filter id="itemShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="1.5" floodColor="#000" floodOpacity="0.4" />
          </filter>
        </defs>

        {
    /* 【背景/地面阴影】 */
  }
        <ellipse cx="150" cy="275" rx="120" ry="12" fill="#000000" opacity="0.3" filter="blur(4px)" className={styles.groundShadow} />

        {
    /* 【台阶地基 (Ground & Steps)】 */
  }
        {
    /* 下层大台阶 */
  }
        <path
    d="M 25 278 L 275 278 L 265 264 L 35 264 Z"
    fill="url(#stepGrad)"
    stroke="#1a202c"
    strokeWidth="1.5"
    strokeLinejoin="round"
  />
        {
    /* 上层小台阶 */
  }
        <path
    d="M 40 264 L 260 264 L 252 252 L 48 252 Z"
    fill="#2d3748"
    stroke="#1a202c"
    strokeWidth="1.5"
    strokeLinejoin="round"
  />
        {
    /* 台阶侧面反光和质感线 */
  }
        <line x1="42" y1="264" x2="258" y2="264" stroke="#ffffff" strokeWidth="1" opacity="0.15" />
        <line x1="27" y1="278" x2="273" y2="278" stroke="#ffffff" strokeWidth="1" opacity="0.1" />
        {
    /* 石板路拼贴线纹理 */
  }
        <path
    d="M 75 264 L 70 278 M 120 264 L 115 278 M 170 264 L 168 278 M 220 264 L 222 278"
    stroke="#1a202c"
    strokeWidth="1"
    opacity="0.3"
  />
        <path
    d="M 90 252 L 88 264 M 140 252 L 138 264 M 195 252 L 197 264"
    stroke="#1a202c"
    strokeWidth="1"
    opacity="0.3"
  />

        {
    /* 【主建筑物墙体 (Main Wall)】 */
  }
        <rect
    x="52"
    y="90"
    width="196"
    height="162"
    fill="url(#wallGrad)"
    stroke="#1a202c"
    strokeWidth="2"
    strokeLinejoin="round"
  />

        {
    /* 墙体拼接缝隙 (写实细线) */
  }
        <g opacity="0.15" stroke="#000000" strokeWidth="1">
          <line x1="52" y1="110" x2="248" y2="110" />
          <line x1="52" y1="130" x2="248" y2="130" />
          <line x1="52" y1="150" x2="248" y2="150" />
          <line x1="52" y1="170" x2="248" y2="170" />
          <line x1="52" y1="190" x2="248" y2="190" />
          <line x1="52" y1="210" x2="248" y2="210" />
          <line x1="52" y1="230" x2="248" y2="230" />
        </g>

        {
    /* 墙角暗部和高光 */
  }
        <rect x="52" y="90" width="12" height="162" fill="url(#sideWallShadow)" />
        <line x1="53" y1="90" x2="53" y2="252" stroke="#ffffff" strokeWidth="1" opacity="0.15" />
        <line x1="247" y1="90" x2="247" y2="252" stroke="#000000" strokeWidth="1.5" opacity="0.4" />

        {
    /* 【复古门 (The Door)】 */
  }
        <g id="store-door">
          {
    /* 门框 */
  }
          <rect x="68" y="138" width="50" height="114" fill="#3b2314" stroke="#1a202c" strokeWidth="2.5" />
          
          {
    /* 门扇及锁具门把手 - hover 时发生推开偏转动效 */
  }
          <g className={styles.door}>
            {
    /* 门扇 */
  }
            <rect x="72" y="141" width="42" height="111" fill="url(#doorWood)" stroke="#1a202c" strokeWidth="1.5" />

            {
    /* 门的上半部分玻璃 */
  }
            <rect x="78" y="148" width="30" height="50" fill="url(#doorGlass)" stroke="#1a202c" strokeWidth="1.5" />
            {
    /* 门玻璃内部暖光透射 */
  }
            <rect x="78" y="148" width="30" height="50" fill="#fef08a" opacity="0.15" className={styles.indoorLight} />
            {
    /* 门玻璃格栅线 */
  }
            <line x1="93" y1="148" x2="93" y2="198" stroke="#1a202c" strokeWidth="1" />
            {
    /* 门玻璃斜光线反光 */
  }
            <path d="M 80 196 L 98 150 L 102 150 L 84 196 Z" fill="#ffffff" opacity="0.25" />

            {
    /* 门的下半部分装饰木镶嵌板 */
  }
            <rect x="78" y="206" width="30" height="38" fill="#5c3112" stroke="#1a202c" strokeWidth="1.5" />
            <rect x="82" y="210" width="22" height="30" fill="#44230c" stroke="#1a202c" strokeWidth="1" />

            {
    /* 金色黄铜门把手与锁孔 */
  }
            <circle cx="110" cy="200" r="2.5" fill="#eab308" stroke="#1a202c" strokeWidth="0.8" />
            <path d="M 110 200 L 114 200 L 114 203 L 110 202 Z" fill="#eab308" stroke="#1a202c" strokeWidth="0.8" />
            <circle cx="110" cy="206" r="1" fill="#1a202c" />
          </g>

          {
    /* 门口的欢迎地垫 */
  }
          <path d="M 70 252 L 116 252 L 120 256 L 66 256 Z" fill="#991b1b" stroke="#1a202c" strokeWidth="1" />
          <text
    x="93"
    y="255"
    fill="#fef08a"
    fontSize="3.5"
    fontWeight="bold"
    textAnchor="middle"
    fontFamily="monospace"
  >
            WELCOME
          </text>
        </g>

        {
    /* 【大橱窗 (The Showcase Window)】 */
  }
        <g id="showcase-window">
          {
    /* 窗框外围 */
  }
          <rect x="130" y="134" width="98" height="84" fill="#2d3748" stroke="#1a202c" strokeWidth="2.5" />
          {
    /* 窗户内室 (背景深色以衬托商品和灯光) */
  }
          <rect x="134" y="138" width="90" height="76" fill="#171e2e" stroke="#1a202c" strokeWidth="1.5" />

          {
    /* 室内暖黄灯光晕染效果 */
  }
          <rect x="134" y="138" width="90" height="76" fill="url(#indoorLight)" className={styles.indoorLight} />

          {
    /* === 窗内货架及陈列商品 === */
  }
          {
    /* 货架背板阴影 */
  }
          <line x1="134" y1="175" x2="224" y2="175" stroke="#111827" strokeWidth="4" opacity="0.6" />
          <line x1="134" y1="202" x2="224" y2="202" stroke="#111827" strokeWidth="4" opacity="0.6" />

          {
    /* 货架1 (中层木隔板) */
  }
          <rect x="134" y="172" width="90" height="4" fill="#8a4b18" stroke="#1a202c" strokeWidth="1" />
          {
    /* 货架2 (下层木隔板) */
  }
          <rect x="134" y="199" width="90" height="4" fill="#8a4b18" stroke="#1a202c" strokeWidth="1" />

          {
    /* 货架上的陈列商品 (中层) */
  }
          {
    /* 瓶子1 */
  }
          <path d="M 140 172 L 140 162 C 140 160, 142 159, 142 156 L 144 156 L 144 172 Z" fill="#3b82f6" opacity="0.9" />
          <rect x="141" y="166" width="3" height="6" fill="#fff" opacity="0.3" />
          {
    /* 瓶子2 (绿) */
  }
          <path d="M 147 172 L 147 160 C 147 158, 149 157, 149 154 L 151 154 L 151 172 Z" fill="#10b981" opacity="0.9" />
          {
    /* 罐头1 (红) */
  }
          <rect x="155" y="162" width="6" height="10" fill="#ef4444" rx="1" stroke="#1a202c" strokeWidth="0.5" />
          <rect x="156" y="164" width="4" height="4" fill="#fef08a" />
          {
    /* 罐头2 (黄) */
  }
          <rect x="163" y="160" width="7" height="12" fill="#f59e0b" rx="1" stroke="#1a202c" strokeWidth="0.5" />
          {
    /* 瓶子3 (深红棕) */
  }
          <path d="M 174 172 L 174 163 C 174 161, 175 160, 175 157 L 177 157 L 177 172 Z" fill="#b91c1c" opacity="0.95" />
          {
    /* 包装礼盒 (紫色) */
  }
          <rect x="183" y="156" width="10" height="16" fill="#8b5cf6" stroke="#1a202c" strokeWidth="0.8" />
          <line x1="188" y1="156" x2="188" y2="172" stroke="#fb7185" strokeWidth="1" />
          {
    /* 蓝色小罐头 */
  }
          <rect x="196" y="164" width="5" height="8" fill="#06b6d4" rx="0.5" stroke="#1a202c" strokeWidth="0.5" />
          {
    /* 两个叠加的小盒 */
  }
          <rect x="204" y="166" width="8" height="6" fill="#ec4899" rx="0.5" stroke="#1a202c" strokeWidth="0.5" />
          <rect x="205" y="160" width="6" height="6" fill="#10b981" rx="0.5" stroke="#1a202c" strokeWidth="0.5" />
          {
    /* 玻璃罐 */
  }
          <rect x="215" y="158" width="6" height="14" fill="#e2e8f0" opacity="0.8" rx="1" stroke="#1a202c" strokeWidth="0.5" />
          <rect x="216" y="162" width="4" height="8" fill="#fb923c" />

          {
    /* 货架上的陈列商品 (下层) */
  }
          {
    /* 面包篮子 */
  }
          <path d="M 138 199 L 154 199 L 151 191 L 141 191 Z" fill="#d97706" stroke="#1a202c" strokeWidth="0.8" />
          {
    /* 面包突起 */
  }
          <ellipse cx="143" cy="190" rx="3" ry="4" fill="#f59e0b" />
          <ellipse cx="147" cy="189" rx="3" ry="5" fill="#fbbf24" />
          <ellipse cx="151" cy="190" rx="2.5" ry="4" fill="#f59e0b" />
          {
    /* 高罐头群 */
  }
          <rect x="160" y="186" width="5" height="13" fill="#64748b" stroke="#1a202c" strokeWidth="0.5" />
          <rect x="166" y="186" width="5" height="13" fill="#64748b" stroke="#1a202c" strokeWidth="0.5" />
          <rect x="172" y="186" width="5" height="13" fill="#64748b" stroke="#1a202c" strokeWidth="0.5" />
          {
    /* 绿色包装盒 */
  }
          <rect x="181" y="182" width="12" height="17" fill="#166534" stroke="#1a202c" strokeWidth="0.8" />
          {
    /* 大玻璃罐 */
  }
          <rect
    x="197"
    y="180"
    width="8"
    height="19"
    fill="#f8fafc"
    opacity="0.75"
    rx="1.5"
    stroke="#1a202c"
    strokeWidth="0.8"
  />
          <circle cx="201" cy="186" r="2.5" fill="#fbbf24" />
          <circle cx="201" cy="192" r="2.5" fill="#f59e0b" />
          {
    /* 水果排 */
  }
          <circle cx="211" cy="196" r="2.5" fill="#ef4444" />
          <circle cx="216" cy="196" r="2.5" fill="#ef4444" />
          <circle cx="221" cy="196" r="2.5" fill="#ef4444" />
          <circle cx="213" cy="192" r="2.5" fill="#fb923c" />
          <circle cx="218" cy="192" r="2.5" fill="#fb923c" />

          {
    /* === 窗格栅与中框 === */
  }
          <line x1="179" y1="138" x2="179" y2="214" stroke="#2d3748" strokeWidth="2" />
          <line x1="134" y1="176" x2="224" y2="176" stroke="#2d3748" strokeWidth="1.5" />

          {
    /* === 窗户玻璃反光面 === */
  }
          <path d="M 136 212 L 206 140 L 222 140 L 152 212 Z" fill="url(#glassReflection)" pointer-events="none" />
          <path
    d="M 170 212 L 220 162 L 222 162 L 176 212 Z"
    fill="url(#glassReflection)"
    pointerEvents="none"
    opacity="0.7"
  />

          {
    /* 挂在玻璃内侧的 "OPEN" 精美挂牌 */
  }
          <g transform="translate(144, 144)" filter="url(#itemShadow)">
            {
    /* 挂绳 */
  }
            <line x1="10" y1="0" x2="15" y2="6" stroke="#d97706" strokeWidth="0.8" />
            <line x1="26" y1="0" x2="21" y2="6" stroke="#d97706" strokeWidth="0.8" />
            {
    /* 牌匾 */
  }
            <rect x="6" y="5" width="24" height="10" rx="1" fill="#1e293b" stroke="#ffffff" strokeWidth="0.8" />
            <text
    x="18"
    y="12"
    fill="#22c55e"
    fontSize="5"
    fontWeight="bold"
    fontFamily="'Courier New', Courier, monospace"
    textAnchor="middle"
    letterSpacing="0.5"
  >
              OPEN
            </text>
          </g>
        </g>

        {
    /* 【招牌上方的复古射灯 (Gooseneck lamps)】 */
  }
        {
    /* 左射灯 */
  }
        <path d="M 95 62 C 95 45, 115 45, 115 54" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
        <path d="M 111 54 L 119 54 L 122 59 L 108 59 Z" fill="#1e293b" stroke="#1a202c" strokeWidth="1" />
        <ellipse cx="115" cy="59" rx="7" ry="1.5" fill="#fef08a" />
        {
    /* 左射灯暖光束 */
  }
        <polygon points="115,59 80,105 150,105" fill="url(#lampGlow)" opacity="0.15" pointerEvents="none" className={styles.lampGlow} />

        {
    /* 右射灯 */
  }
        <path d="M 205 62 C 205 45, 185 45, 185 54" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
        <path d="M 181 54 L 189 54 L 192 59 L 178 59 Z" fill="#1e293b" stroke="#1a202c" stroke-width="1" />
        <ellipse cx="185" cy="59" rx="7" ry="1.5" fill="#fef08a" />
        {
    /* 右射灯暖光束 */
  }
        <polygon points="185,59 150,105 220,105" fill="url(#lampGlow)" opacity="0.15" pointerEvents="none" className={styles.lampGlow} />

        {
    /* 【复古遮阳棚 (Awning)】 */
  }
        {
    /* 遮阳棚上沿 */
  }
        <g id="awning" filter="url(#softShadow)">
          {
    /* 遮阳棚的立体侧边 */
  }
          <path d="M 46 88 L 254 88 L 258 120 L 250 126 L 50 126 L 42 120 Z" fill="#b91c1c" />

          {
    /* 棚面条纹 (红白相间) */
  }
          {
    /* 条纹1 (红) */
  }
          <path d="M 46 88 L 62 88 L 60 122 L 50 126 L 42 120 Z" fill="url(#awningRed)" stroke="#1a202c" strokeWidth="1" />
          {
    /* 条纹2 (白) */
  }
          <path d="M 62 88 L 78 88 L 77 122 L 68 124 L 60 122 Z" fill="url(#awningWhite)" stroke="#1a202c" strokeWidth="1" />
          {
    /* 条纹3 (红) */
  }
          <path d="M 78 88 L 94 88 L 94 122 L 85 124 L 77 122 Z" fill="url(#awningRed)" stroke="#1a202c" strokeWidth="1" />
          {
    /* 条纹4 (白) */
  }
          <path
    d="M 94 88 L 110 88 L 111 122 L 102 124 L 94 122 Z"
    fill="url(#awningWhite)"
    stroke="#1a202c"
    strokeWidth="1"
  />
          {
    /* 条纹5 (红) */
  }
          <path
    d="M 110 88 L 126 88 L 128 122 L 119 124 L 111 122 Z"
    fill="url(#awningRed)"
    stroke="#1a202c"
    strokeWidth="1"
  />
          {
    /* 条纹6 (白) */
  }
          <path
    d="M 126 88 L 142 88 L 145 122 L 136 124 L 128 122 Z"
    fill="url(#awningWhite)"
    stroke="#1a202c"
    strokeWidth="1"
  />
          {
    /* 条纹7 (红) */
  }
          <path
    d="M 142 88 L 158 88 L 161 122 L 153 124 L 145 122 Z"
    fill="url(#awningRed)"
    stroke="#1a202c"
    strokeWidth="1"
  />
          {
    /* 条纹8 (白) */
  }
          <path
    d="M 158 88 L 174 88 L 178 122 L 169 124 L 161 122 Z"
    fill="url(#awningWhite)"
    stroke="#1a202c"
    strokeWidth="1"
  />
          {
    /* 条纹9 (红) */
  }
          <path
    d="M 174 88 L 190 88 L 195 122 L 186 124 L 178 122 Z"
    fill="url(#awningRed)"
    stroke="#1a202c"
    strokeWidth="1"
  />
          {
    /* 条纹10 (白) */
  }
          <path
    d="M 190 88 L 206 88 L 211 122 L 203 124 L 195 122 Z"
    fill="url(#awningWhite)"
    stroke="#1a202c"
    strokeWidth="1"
  />
          {
    /* 条纹11 (红) */
  }
          <path
    d="M 206 88 L 222 88 L 228 122 L 219 124 L 211 122 Z"
    fill="url(#awningRed)"
    stroke="#1a202c"
    strokeWidth="1"
  />
          {
    /* 条纹12 (白) */
  }
          <path
    d="M 222 88 L 238 88 L 244 122 L 236 124 L 228 122 Z"
    fill="url(#awningWhite)"
    stroke="#1a202c"
    strokeWidth="1"
  />
          {
    /* 条纹13 (红) */
  }
          <path
    d="M 238 88 L 254 88 L 258 120 L 250 126 L 244 122 Z"
    fill="url(#awningRed)"
    stroke="#1a202c"
    strokeWidth="1"
  />

          {
    /* 雨棚边缘的小波浪花边 (荷叶边 Scallop edge) */
  }
          <path
    d="M 42 120 C 44 124, 48 124, 50 120 C 52 124, 58 124, 60 120 C 62 124, 66 124, 68 120 C 70 124, 75 124, 77 120 C 79 124, 83 124, 85 120 C 87 124, 92 124, 94 120 C 96 124, 100 124, 102 120 C 104 124, 109 124, 111 120 C 113 124, 117 124, 119 120 C 121 124, 126 124, 128 120 C 130 124, 134 124, 136 120 C 138 124, 143 124, 145 120 C 147 124, 151 124, 153 120 C 155 124, 160 124, 162 120 C 164 124, 167 124, 169 120 C 171 124, 176 124, 178 120 C 180 124, 184 124, 186 120 C 188 124, 193 124, 195 120 C 197 124, 201 124, 203 120 C 205 124, 210 124, 212 120 C 214 124, 217 124, 219 120 C 221 124, 226 124, 228 120 C 230 124, 234 124, 236 120 C 238 124, 242 124, 244 120 C 246 124, 248 124, 250 120 C 252 124, 256 124, 258 120"
    fill="#b91c1c"
    stroke="#1a202c"
    strokeWidth="0.8"
  />
        </g>

        {
    /* 遮阳棚投影在墙体和门窗上的渐变阴影 */
  }
        <rect x="52" y="126" width="196" height="15" fill="url(#awningShadow)" pointer-events="none" />

        {
    /* 【精美瓦片屋顶 (The Roof & Chimney)】 */
  }
        {
    /* 烟囱 (Chimney) */
  }
        <g id="chimney">
          <rect x="208" y="32" width="22" height="40" fill="#991b1b" stroke="#1a202c" strokeWidth="1.8" />
          {
    /* 烟囱砖缝纹理 */
  }
          <line x1="208" y1="42" x2="230" y2="42" stroke="#1a202c" strokeWidth="0.8" opacity="0.4" />
          <line x1="208" y1="52" x2="230" y2="52" stroke="#1a202c" strokeWidth="0.8" opacity="0.4" />
          <line x1="208" y1="62" x2="230" y2="62" stroke="#1a202c" strokeWidth="0.8" opacity="0.4" />
          <line x1="215" y1="32" x2="215" y2="42" stroke="#1a202c" strokeWidth="0.8" opacity="0.4" />
          <line x1="223" y1="42" x2="223" y2="52" stroke="#1a202c" strokeWidth="0.8" opacity="0.4" />
          <line x1="213" y1="52" x2="213" y2="62" stroke="#1a202c" strokeWidth="0.8" opacity="0.4" />
          {
    /* 烟囱顶部护罩 */
  }
          <rect x="204" y="27" width="30" height="6" fill="#374151" stroke="#1a202c" strokeWidth="1.5" rx="1" />
          {
    /* 淡淡的烟雾效果 */
  }
          <path d="M 219 22 C 215 14, 225 10, 221 4" fill="none" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" className={styles.smoke1} />
          <path d="M 217 25 C 220 18, 213 14, 218 8" fill="none" stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round" className={styles.smoke2} />
        </g>

        {
    /* 屋顶主体 (瓦片折角) */
  }
        <polygon
    points="40,90 260,90 230,48 70,48"
    fill="url(#roofGrad)"
    stroke="#1a202c"
    strokeWidth="2.2"
    strokeLinejoin="round"
  />

        {
    /* 屋顶顶脊 */
  }
        <polygon points="68,48 232,48 226,42 74,42" fill="#1f2937" stroke="#1a202c" strokeWidth="1.8" strokeLinejoin="round" />

        {
    /* 屋顶瓦片纹理 (写实叠加多层圆弧线) */
  }
        <g opacity="0.25" stroke="#000" strokeWidth="1">
          <path d="M 45 80 C 50 83, 55 83, 60 80 C 65 83, 70 83, 75 80 C 80 83, 85 83, 90 80 C 95 83, 100 83, 105 80 C 110 83, 115 83, 120 80 C 125 83, 130 83, 135 80 C 140 83, 145 83, 150 80 C 155 83, 160 83, 165 80 C 170 83, 175 83, 180 80 C 185 83, 190 83, 195 80 C 200 83, 205 83, 210 80 C 215 83, 220 83, 225 80 C 230 83, 235 83, 240 80 C 245 83, 250 83, 255 80" />
          <path d="M 58 66 C 63 69, 68 69, 73 66 C 78 69, 83 69, 88 66 C 93 69, 98 69, 103 66 C 108 69, 113 69, 118 66 C 123 69, 128 69, 133 66 C 138 69, 143 69, 148 66 C 153 69, 158 69, 163 66 C 168 69, 173 69, 178 66 C 183 69, 188 69, 193 66 C 198 69, 203 69, 208 66 C 213 69, 218 69, 223 66 C 228 69, 233 69, 238 66" />
          <path d="M 72 52 C 77 55, 82 55, 87 52 Q 92 55, 97 55 Q 102 55, 107 52 C 112 55, 117 55, 122 52 C 127 55, 132 55, 137 52 C 142 55, 147 55, 152 52 C 157 55, 162 55, 167 52 C 172 55, 177 55, 182 52 C 187 55, 192 55, 197 52 C 202 55, 207 55, 212 52 C 217 55, 222 55, 227 52 C 232 55, 237 55, 242 52" />
        </g>

        {
    /* 屋顶侧面收边木板 */
  }
        <polygon points="40,90 44,90 74,48 70,48" fill="#1a202c" />
        <polygon points="260,90 256,90 226,48 230,48" fill="#1a202c" />

        {
    /* 【悬挂复古木制大招牌 (The Signboard)】 */
  }
        <g id="main-signboard" filter="url(#softShadow)" className={styles.signboard}>
          {
    /* 铁链1 (左) */
  }
          <path d="M 112 48 L 112 70" stroke="#1f2937" strokeWidth="1.8" strokeDasharray="2 1" />
          {
    /* 铁链2 (right) */
  }
          <path d="M 188 48 L 188 70" stroke="#1f2937" strokeWidth="1.8" strokeDasharray="2 1" />

          {
    /* 招牌的挂耳 */
  }
          <rect x="110" y="67" width="4" height="4" fill="#374151" stroke="#1a202c" strokeWidth="1" rx="0.5" />
          <rect x="186" y="67" width="4" height="4" fill="#374151" stroke="#1a202c" strokeWidth="1" rx="0.5" />

          {
    /* 招牌框架与厚度 */
  }
          <rect x="94" y="69" width="112" height="23" fill="#1e293b" stroke="#1a202c" strokeWidth="2" rx="3" />
          {
    /* 招牌面板内衬 (深蓝色/金黄色文字) */
  }
          <rect x="98" y="72" width="104" height="17" fill="url(#stoneGrad)" stroke="#1a202c" strokeWidth="1" rx="1.5" />

          {
    /* 招牌文字 "知音杂货铺" */
  }
          <text
    x="150"
    y="81.5"
    fill="#fbbf24"
    fontSize="11"
    fontWeight="900"
    fontFamily="'PingFang SC', 'Microsoft YaHei', 'STHeiti', system-ui, sans-serif"
    textAnchor="middle"
    dominantBaseline="central"
    letterSpacing="2.5"
    filter="url(#itemShadow)"
  >
            知音杂货铺
          </text>
          {
    /* 文字装饰边框 */
  }
          <rect x="100" y="74" width="100" height="13" fill="none" stroke="#fbbf24" strokeWidth="0.6" opacity="0.3" rx="1" />
        </g>

        {
    /* 【门口的小细节装饰 (Groceries and Plants)】 */
  }
        {
    /* 左侧：写实花盆与大片绿植 (Potted Plant) */
  }
        <g id="left-plant" filter="url(#itemShadow)">
          {
    /* 绿植叶片叠放 */
  }
          <path d="M 52 238 C 45 220, 36 225, 40 238" fill="url(#leafGrad)" stroke="#0f5132" strokeWidth="0.8" />
          <path d="M 58 238 C 50 215, 42 220, 48 238" fill="url(#leafGrad)" stroke="#0f5132" strokeWidth="0.8" />
          <path d="M 64 238 C 72 215, 80 220, 72 238" fill="url(#leafGrad)" stroke="#0f5132" strokeWidth="0.8" />
          <path d="M 60 238 C 60 205, 50 210, 54 238" fill="url(#leafGrad)" stroke="#0f5132" strokeWidth="0.8" />
          <path d="M 62 238 C 65 210, 75 215, 66 238" fill="url(#leafGrad)" stroke="#0f5132" strokeWidth="0.8" />
          <path d="M 54 238 C 48 228, 62 228, 58 238" fill="#86efac" opacity="0.9" />

          {
    /* 陶土花盆 */
  }
          <path d="M 48 238 L 68 238 L 64 256 L 52 256 Z" fill="url(#potGrad)" stroke="#1a202c" strokeWidth="1.2" />
          {
    /* 花盆边沿 */
  }
          <rect x="46" y="236" width="24" height="3" fill="#b45309" stroke="#1a202c" strokeWidth="1" rx="0.5" />
        </g>

        {
    /* 右侧：门口放置的水果木筐 */
  }
        <g id="right-fruit-crate" transform="translate(182, 218)" filter="url(#itemShadow)">
          {
    /* 木箱投影 */
  }
          <rect x="-2" y="18" width="50" height="18" fill="#000000" opacity="0.2" rx="1" filter="blur(1px)" />

          {
    /* 后面斜立的小黑板立牌 (Menu sign) */
  }
          <g transform="translate(-14, -14)">
            {
    /* 黑板支架木腿 */
  }
            <line x1="4" y1="20" x2="1" y2="48" stroke="#5c3112" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="22" y1="20" x2="25" y2="48" stroke="#5c3112" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="10" y1="20" x2="18" y2="46" stroke="#451a03" strokeWidth="1.8" />
            {
    /* 黑板外框 */
  }
            <rect x="0" y="10" width="26" height="32" fill="#78350f" stroke="#1a202c" strokeWidth="1.5" rx="1.5" />
            {
    /* 黑板板面 */
  }
            <rect x="3" y="13" width="20" height="26" fill="#1e293b" />
            {
    /* 粉笔手写字样 */
  }
            <path d="M 6 18 Q 12 16, 18 17 M 6 23 Q 10 24, 15 22 M 6 28 Q 14 26, 17 29" fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.8" />
            <circle cx="8" cy="34" r="1.5" fill="#f87171" />
            <circle cx="13" cy="34" r="1.5" fill="#fbbf24" />
            <circle cx="18" cy="34" r="1.5" fill="#60a5fa" />
          </g>

          {
    /* 木箱1 (左边盛放红苹果) */
  }
          <rect x="0" y="16" width="22" height="18" fill="#d97706" stroke="#1a202c" strokeWidth="1.2" rx="1" />
          {
    /* 木箱板缝纹理 */
  }
          <line x1="0" y1="22" x2="22" y2="22" stroke="#451a03" strokeWidth="0.8" opacity="0.4" />
          <line x1="0" y1="28" x2="22" y2="28" stroke="#451a03" strokeWidth="0.8" opacity="0.4" />

          {
    /* 箱子里的苹果 */
  }
          <circle cx="4" cy="14" r="3" fill="url(#appleGrad)" stroke="#7f1d1d" strokeWidth="0.5" />
          <circle cx="10" cy="14" r="3.2" fill="url(#appleGrad)" stroke="#7f1d1d" stroke-width="0.5" />
          <circle cx="16" cy="15" r="2.8" fill="url(#appleGrad)" stroke="#7f1d1d" stroke-width="0.5" />
          <circle cx="7" cy="11" r="3" fill="url(#appleGrad)" stroke="#7f1d1d" stroke-width="0.5" />
          <circle cx="13" cy="11" r="3" fill="url(#appleGrad)" stroke="#7f1d1d" stroke-width="0.5" />
          <circle cx="10" cy="8" r="2.8" fill="url(#appleGrad)" stroke="#7f1d1d" stroke-width="0.5" />
          {
    /* 绿叶 */
  }
          <path d="M 9 6 Q 7 4, 10 2 Q 11 4, 10 6 Z" fill="#22c55e" />

          {
    /* 木箱2 (右边盛放黄澄澄的橙子) */
  }
          <rect x="25" y="16" width="22" height="18" fill="#d97706" stroke="#1a202c" strokeWidth="1.2" rx="1" />
          {
    /* 木箱板缝纹理 */
  }
          <line x1="25" y1="22" x2="47" y2="22" stroke="#451a03" strokeWidth="0.8" opacity="0.4" />
          <line x1="25" y1="28" x2="47" y2="28" stroke="#451a03" strokeWidth="0.8" opacity="0.4" />

          {
    /* 箱子里的橙子 */
  }
          <circle cx="29" cy="15" r="3" fill="url(#orangeGrad)" stroke="#7c2d12" strokeWidth="0.5" />
          <circle cx="35" cy="14" r="3.2" fill="url(#orangeGrad)" stroke="#7c2d12" stroke-width="0.5" />
          <circle cx="41" cy="15" r="2.8" fill="url(#orangeGrad)" stroke="#7c2d12" stroke-width="0.5" />
          <circle cx="32" cy="11" r="3.1" fill="url(#orangeGrad)" stroke="#7c2d12" stroke-width="0.5" />
          <circle cx="38" cy="11" r="2.9" fill="url(#orangeGrad)" stroke="#7c2d12" stroke-width="0.5" />
          <circle cx="35" cy="8" r="3" fill="url(#orangeGrad)" stroke="#7c2d12" stroke-width="0.5" />
        </g>

        {
    /* 【侧墙壁灯 (Wall Lamp)】 */
  }
        <g id="wall-lamp">
          {
    /* 壁灯金属支架 */
  }
          <path d="M 248 160 C 255 160, 258 152, 258 146 C 258 140, 252 140, 252 140" fill="none" stroke="#1a202c" strokeWidth="1.8" />
          {
    /* 壁灯罩 */
  }
          <path d="M 252 140 L 264 140 L 267 145 L 249 145 Z" fill="#475569" stroke="#1a202c" strokeWidth="1" />
          {
    /* 灯泡 */
  }
          <circle cx="258" cy="147" r="3" fill="#fef08a" />
          {
    /* 壁灯发出的柔和黄光晕 */
  }
          <circle cx="258" cy="147" r="18" fill="url(#lampGlow)" opacity="0.3" pointerEvents="none" className={styles.wallLampGlow} />
        </g>
      </svg>
    </div>;
}
export {
  GroceryStore as default
};
