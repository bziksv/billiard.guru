"use client";

/** Единая декоративная сцена hero — шары россыпью по столу, кий справа. */

type Parallax = { x: number; y: number };

const SCALE = {
  pyramid: 92,
  pool: 72,
  snooker: 66,
} as const;

function SceneItem({
  parallax,
  px = 1,
  py = 1,
  float = "normal",
  className = "",
  style,
  children,
}: {
  parallax: Parallax;
  px?: number;
  py?: number;
  float?: "normal" | "delayed" | "slow";
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const floatClass =
    float === "delayed"
      ? "home-animate-float-delayed"
      : float === "slow"
        ? "home-animate-float-slow"
        : "home-animate-float";

  return (
    <div
      className={`home-scene-item absolute ${className}`}
      style={{
        ...style,
        transform: `translate(${parallax.x * px}px, ${parallax.y * py}px)`,
      }}
    >
      <div className={floatClass}>{children}</div>
    </div>
  );
}

function BallShadow({ w }: { w: number }) {
  return (
    <ellipse
      cx={w / 2}
      cy={w * 0.92}
      rx={w * 0.38}
      ry={w * 0.08}
      fill="#000"
      opacity={0.35}
    />
  );
}

function SphereHighlight({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <>
      <ellipse
        cx={cx - r * 0.28}
        cy={cy - r * 0.32}
        rx={r * 0.38}
        ry={r * 0.28}
        fill="white"
        opacity={0.55}
      />
      <ellipse
        cx={cx - r * 0.12}
        cy={cy - r * 0.38}
        rx={r * 0.12}
        ry={r * 0.08}
        fill="white"
        opacity={0.75}
      />
      <ellipse
        cx={cx + r * 0.35}
        cy={cy + r * 0.28}
        rx={r * 0.18}
        ry={r * 0.12}
        fill="#000"
        opacity={0.12}
      />
    </>
  );
}

function PyramidCueBall({ size = SCALE.pyramid * 0.75 }: { size?: number }) {
  const id = "pyr-cue";
  const r = size / 2 - 2;
  const c = size / 2;

  return (
    <svg width={size} height={size * 1.05} viewBox={`0 0 ${size} ${size * 1.05}`} aria-hidden>
      <defs>
        <radialGradient id={`${id}-g`} cx="32%" cy="28%" r="68%">
          <stop offset="0%" stopColor="#b91c1c" />
          <stop offset="45%" stopColor="#7f1d1d" />
          <stop offset="100%" stopColor="#450a0a" />
        </radialGradient>
      </defs>
      <BallShadow w={size} />
      <circle cx={c} cy={c} r={r} fill={`url(#${id}-g)`} />
      <SphereHighlight cx={c} cy={c} r={r} />
    </svg>
  );
}

function PyramidBall({
  number,
  numberColor,
  size = SCALE.pyramid,
}: {
  number: number;
  numberColor: string;
  size?: number;
}) {
  const id = `pyr-${number}`;
  const r = size / 2 - 2;
  const c = size / 2;

  return (
    <svg width={size} height={size * 1.05} viewBox={`0 0 ${size} ${size * 1.05}`} aria-hidden>
      <defs>
        <radialGradient id={`${id}-g`} cx="32%" cy="26%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#f5f0e6" />
          <stop offset="75%" stopColor="#e7e0d4" />
          <stop offset="100%" stopColor="#c4b8a8" />
        </radialGradient>
      </defs>
      <BallShadow w={size} />
      <circle cx={c} cy={c} r={r} fill={`url(#${id}-g)`} />
      <SphereHighlight cx={c} cy={c} r={r} />
      <text
        x={c}
        y={c + size * 0.04}
        textAnchor="middle"
        dominantBaseline="central"
        fill={numberColor}
        fontSize={size * 0.34}
        fontWeight="800"
        fontFamily="Georgia, 'Times New Roman', serif"
        style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.08)", strokeWidth: 0.5 }}
      >
        {number}
      </text>
    </svg>
  );
}

function SnookerBall({
  variant,
  size = SCALE.snooker * 0.52,
}: {
  variant: "white" | "red" | "yellow" | "green" | "brown" | "blue" | "pink" | "black";
  size?: number;
}) {
  const palette: Record<string, [string, string, string]> = {
    white: ["#ffffff", "#f5f5f4", "#d4d4d8"],
    red: ["#f87171", "#dc2626", "#991b1b"],
    yellow: ["#fde047", "#eab308", "#a16207"],
    green: ["#4ade80", "#16a34a", "#14532d"],
    brown: ["#a16207", "#78350f", "#451a03"],
    blue: ["#60a5fa", "#2563eb", "#1e3a8a"],
    pink: ["#f472b6", "#db2777", "#9d174d"],
    black: ["#52525b", "#27272a", "#09090b"],
  };
  const [hi, mid, lo] = palette[variant];
  const id = `snk-${variant}-${size}`;
  const r = size / 2 - 1.5;
  const c = size / 2;

  return (
    <svg width={size} height={size * 1.05} viewBox={`0 0 ${size} ${size * 1.05}`} aria-hidden>
      <defs>
        <radialGradient id={`${id}-g`} cx="30%" cy="26%" r="72%">
          <stop offset="0%" stopColor={hi} />
          <stop offset="50%" stopColor={mid} />
          <stop offset="100%" stopColor={lo} />
        </radialGradient>
      </defs>
      <BallShadow w={size} />
      <circle cx={c} cy={c} r={r} fill={`url(#${id}-g)`} />
      <SphereHighlight cx={c} cy={c} r={r} />
    </svg>
  );
}

function PoolSolidBall({
  number,
  size = SCALE.pool * 0.85,
}: {
  number: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  size?: number;
}) {
  const colors: Record<number, [string, string, string]> = {
    1: ["#fde047", "#eab308", "#854d0e"],
    2: ["#60a5fa", "#2563eb", "#1e3a8a"],
    3: ["#f87171", "#dc2626", "#991b1b"],
    4: ["#c084fc", "#9333ea", "#581c87"],
    5: ["#fb923c", "#ea580c", "#9a3412"],
    6: ["#4ade80", "#16a34a", "#14532d"],
    7: ["#b45309", "#78350f", "#451a03"],
  };
  const [hi, mid, lo] = colors[number];
  const id = `pool-${number}`;
  const r = size / 2 - 1.5;
  const c = size / 2;

  return (
    <svg width={size} height={size * 1.05} viewBox={`0 0 ${size} ${size * 1.05}`} aria-hidden>
      <defs>
        <radialGradient id={`${id}-g`} cx="30%" cy="26%" r="72%">
          <stop offset="0%" stopColor={hi} />
          <stop offset="55%" stopColor={mid} />
          <stop offset="100%" stopColor={lo} />
        </radialGradient>
      </defs>
      <BallShadow w={size} />
      <circle cx={c} cy={c} r={r} fill={`url(#${id}-g)`} />
      <SphereHighlight cx={c} cy={c} r={r} />
      <text
        x={c}
        y={c + size * 0.03}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={size * 0.38}
        fontWeight="800"
        fontFamily="Arial, sans-serif"
        opacity={0.95}
      >
        {number}
      </text>
    </svg>
  );
}

function PoolEightBall({ size = SCALE.pool }: { size?: number }) {
  const r = size / 2 - 2;
  const c = size / 2;
  const id = "pool-8";

  return (
    <svg width={size} height={size * 1.05} viewBox={`0 0 ${size} ${size * 1.05}`} aria-hidden>
      <defs>
        <radialGradient id={`${id}-g`} cx="30%" cy="26%" r="72%">
          <stop offset="0%" stopColor="#52525b" />
          <stop offset="55%" stopColor="#18181b" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
      </defs>
      <BallShadow w={size} />
      <circle cx={c} cy={c} r={r} fill={`url(#${id}-g)`} />
      <SphereHighlight cx={c} cy={c} r={r} />
      <circle cx={c} cy={c} r={r * 0.48} fill="white" />
      <text
        x={c}
        y={c + size * 0.02}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#0a0a0a"
        fontSize={size * 0.32}
        fontWeight="900"
        fontFamily="Arial, sans-serif"
      >
        8
      </text>
    </svg>
  );
}

function PoolStripeBall({ size = SCALE.pool * 0.8 }: { size?: number }) {
  const r = size / 2 - 1.5;
  const c = size / 2;
  const id = "pool-9";

  return (
    <svg width={size} height={size * 1.05} viewBox={`0 0 ${size} ${size * 1.05}`} aria-hidden>
      <defs>
        <radialGradient id={`${id}-base`} cx="30%" cy="26%" r="72%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#ca8a04" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx={c} cy={c} r={r} />
        </clipPath>
      </defs>
      <BallShadow w={size} />
      <circle cx={c} cy={c} r={r} fill="white" />
      <g clipPath={`url(#${id}-clip)`}>
        <rect x={0} y={c - r * 0.38} width={size} height={r * 0.76} fill={`url(#${id}-base)`} />
      </g>
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />
      <SphereHighlight cx={c} cy={c} r={r} />
      <text
        x={c}
        y={c + size * 0.03}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={size * 0.34}
        fontWeight="800"
        fontFamily="Arial, sans-serif"
      >
        9
      </text>
    </svg>
  );
}

/** Профиль кия: half-width по длине (tip → butt). */
function cueProfile(x: number): number {
  if (x < 38) return 4.2;
  if (x < 305) {
    const t = (x - 38) / (305 - 38);
    return 4.2 + t * 5.3;
  }
  if (x < 322) return 9.8;
  if (x < 415) return 10.8;
  if (x < 555) return 12.2;
  if (x < 580) return 11;
  return 8;
}

function cueBodyPath(cy: number, x0: number, x1: number): string {
  const steps = 28;
  const top: string[] = [];
  const bot: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const w = cueProfile(x);
    top.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${(cy - w).toFixed(1)}`);
    bot.unshift(`L ${x.toFixed(1)} ${(cy + w).toFixed(1)}`);
  }
  return `${top.join(" ")} ${bot.join(" ")} Z`;
}

/** Кий — вид сбоку на столе: конус шaftа, толстый бутс, кожаная наклейка. */
function BilliardCue({ parallax }: { parallax: Parallax }) {
  const cy = 42;

  return (
    <div
      className="home-scene-item absolute right-[1%] top-[16%] hidden sm:block"
      style={{
        transform: `translate(${parallax.x * -0.35}px, ${parallax.y * 0.25}px)`,
      }}
      aria-hidden
    >
      <div className="home-animate-cue-drift origin-[8%_50%]" style={{ rotate: "-24deg" }}>
        <svg width="580" height="88" viewBox="0 0 580 88" fill="none" aria-hidden>
          <defs>
            <linearGradient id="cue-maple-v" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.38" />
              <stop offset="42%" stopColor="#fff" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.32" />
            </linearGradient>
            <linearGradient id="cue-maple-h" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f0d4a8" />
              <stop offset="35%" stopColor="#d4a574" />
              <stop offset="70%" stopColor="#b8845a" />
              <stop offset="100%" stopColor="#8b5a2b" />
            </linearGradient>
            <linearGradient id="cue-butt-h" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4a3728" />
              <stop offset="55%" stopColor="#2a1f16" />
              <stop offset="100%" stopColor="#120c08" />
            </linearGradient>
            <pattern id="cue-linen" width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="#141414" />
              <path d="M0 3h6M3 0v6" stroke="#262626" strokeWidth="0.45" />
              <path d="M0 0l6 6M6 0L0 6" stroke="#0a0a0a" strokeWidth="0.3" opacity="0.55" />
            </pattern>
            <filter id="cue-drop">
              <feDropShadow dx="1" dy="5" stdDeviation="6" floodColor="#000" floodOpacity="0.45" />
            </filter>
          </defs>

          <g filter="url(#cue-drop)">
            <path
              d="M 6 62 Q 290 68 574 58"
              stroke="#000"
              strokeWidth="10"
              opacity={0.22}
              strokeLinecap="round"
            />

            <path d={cueBodyPath(cy, 38, 305)} fill="url(#cue-maple-h)" />
            <path d={cueBodyPath(cy, 38, 305)} fill="url(#cue-maple-v)" />

            <path d={cueBodyPath(cy, 322, 415)} fill="url(#cue-linen)" />
            <path d={cueBodyPath(cy, 322, 415)} fill="url(#cue-maple-v)" opacity={0.35} />

            <path d={cueBodyPath(cy, 415, 555)} fill="url(#cue-butt-h)" />
            <path d={cueBodyPath(cy, 415, 555)} fill="url(#cue-maple-v)" opacity={0.45} />

            <path d={cueBodyPath(cy, 555, 580)} fill="#0a0a0a" />

            {/* наклейка — тонкая кожаная торцевая грань, не «шарик» */}
            <path d={cueBodyPath(cy, 0, 9)} fill="#3d2914" />
            <line
              x1={0}
              y1={cy - 4.2}
              x2={0}
              y2={cy + 4.2}
              stroke="#2a1a0e"
              strokeWidth="0.6"
            />

            <path d={cueBodyPath(cy, 9, 38)} fill="#f5f5f4" stroke="#d4d4d8" strokeWidth="0.4" />

            <path d={cueBodyPath(cy, 305, 322)} fill="#e7e5e4" stroke="#a8a29e" strokeWidth="0.5" />

            {[440, 465, 490, 515, 540].map((x) => {
              const w = cueProfile(x);
              return (
                <line
                  key={x}
                  x1={x}
                  y1={cy - w + 1}
                  x2={x}
                  y2={cy + w - 1}
                  stroke="#d6d3d1"
                  strokeWidth="1.2"
                  opacity={0.55}
                />
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}

function TableSurface({ parallax }: { parallax: Parallax }) {
  return (
    <div
      className="absolute left-1/2 top-[54%] h-[min(480px,62vw)] w-[min(820px,98vw)] -translate-x-1/2 -translate-y-1/2"
      style={{
        transform: `translate(calc(-50% + ${parallax.x * 0.45}px), calc(-50% + ${parallax.y * 0.45}px))`,
      }}
    >
      <div
        className="absolute inset-0 rounded-[999px] border border-emerald-900/50 shadow-[inset_0_0_120px_rgba(0,0,0,0.65),0_50px_100px_rgba(0,0,0,0.55)]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 38%, #15803d 0%, #14532d 38%, #052e16 72%, #011a14 100%)",
        }}
      >
        <div
          className="absolute inset-0 rounded-[999px] opacity-40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(127deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 3px)",
          }}
        />
        <div className="absolute inset-6 rounded-[999px] border border-emerald-700/25" />
      </div>
      <div className="absolute -inset-x-4 -top-3 h-8 rounded-[999px] bg-gradient-to-b from-amber-950/50 to-transparent" />
    </div>
  );
}

const snk = SCALE.snooker * 0.52;

/** Снукерные шары — россыпь по правой половине стола (единая сцена). */
const SNOOKER_SCATTER: {
  variant: "white" | "red" | "yellow" | "green" | "brown" | "blue" | "pink" | "black";
  className: string;
  float?: "normal" | "delayed" | "slow";
  px?: number;
  py?: number;
}[] = [
  { variant: "white", className: "right-[34%] top-[34%]", float: "delayed", px: -0.9, py: 0.85 },
  { variant: "red", className: "right-[26%] top-[48%]", px: -1, py: 0.9 },
  { variant: "yellow", className: "right-[38%] top-[44%]", float: "slow", px: -0.85, py: 0.95 },
  { variant: "red", className: "right-[20%] top-[40%]", float: "delayed", px: -1.05, py: 0.8 },
  { variant: "blue", className: "right-[44%] top-[52%]", px: -0.95, py: 0.88 },
  { variant: "red", className: "right-[30%] top-[56%]", float: "slow", px: -1, py: 0.92 },
  { variant: "red", className: "right-[16%] top-[52%]", px: -1.1, py: 0.85 },
  { variant: "red", className: "right-[48%] top-[42%]", float: "delayed", px: -0.8, py: 0.9 },
  { variant: "red", className: "right-[22%] top-[62%]", px: -1, py: 0.95 },
  { variant: "yellow", className: "right-[12%] top-[58%]", float: "slow", px: -1.05, py: 0.82 },
  { variant: "green", className: "right-[42%] top-[62%]", px: -0.9, py: 0.9 },
  { variant: "brown", className: "right-[52%] top-[54%]", float: "delayed", px: -0.85, py: 0.88 },
  { variant: "blue", className: "right-[8%] top-[44%]", px: -1.1, py: 0.85 },
  { variant: "pink", className: "right-[50%] top-[36%]", float: "slow", px: -0.8, py: 0.92 },
  { variant: "black", className: "right-[56%] top-[46%]", px: -0.75, py: 0.9 },
];

export function HomeBilliardScene({ parallax }: { parallax: Parallax }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="home-noise absolute inset-0 opacity-[0.035]" />
      <div className="home-felt-gradient absolute inset-0" />

      <TableSurface parallax={parallax} />

      {/* ── Пирамида ── */}
      <SceneItem parallax={parallax} px={1.2} py={1} className="left-[4%] top-[28%] sm:left-[7%]">
        <PyramidBall number={5} numberColor="#2563eb" size={SCALE.pyramid} />
        <span className="mt-1 block text-[9px] uppercase tracking-wider text-zinc-500">
          пирамида · 68 мм
        </span>
      </SceneItem>

      <SceneItem
        parallax={parallax}
        px={0.9}
        py={1.1}
        float="delayed"
        className="left-[18%] top-[54%] hidden sm:block"
      >
        <PyramidBall number={12} numberColor="#dc2626" size={SCALE.pyramid * 0.82} />
      </SceneItem>

      <SceneItem parallax={parallax} px={0.85} py={0.95} float="slow" className="left-[32%] top-[58%]">
        <PyramidCueBall size={SCALE.pyramid * 0.72} />
      </SceneItem>

      {/* ── Пул ── */}
      <SceneItem parallax={parallax} px={-1.1} py={0.75} className="left-[2%] top-[52%] sm:left-[3%]">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-end gap-1">
            <PoolEightBall size={SCALE.pool} />
            <PoolStripeBall size={SCALE.pool * 0.88} />
          </div>
          <PoolSolidBall number={3} size={SCALE.pool * 0.75} />
          <span className="text-[9px] uppercase tracking-wider text-zinc-500">пул · 57 мм</span>
        </div>
      </SceneItem>

      {/* ── Снукер — россыпь, продолжение сцены вправо ── */}
      {SNOOKER_SCATTER.map(({ variant, className, float, px, py }, i) => (
        <SceneItem
          key={`${variant}-${i}`}
          parallax={parallax}
          px={px ?? -1}
          py={py ?? 0.85}
          float={float}
          className={className}
        >
          <SnookerBall variant={variant} size={snk} />
        </SceneItem>
      ))}

      <SceneItem parallax={parallax} px={-0.9} py={0.85} className="right-[14%] top-[68%] hidden sm:block">
        <span className="text-[9px] uppercase tracking-wider text-zinc-500">снукер · 52,5 мм</span>
      </SceneItem>

      <BilliardCue parallax={parallax} />

      <div
        className="home-animate-glow absolute left-1/2 top-[18%] h-[min(300px,38vw)] w-[min(460px,68vw)] -translate-x-1/2 rounded-full bg-emerald-400/8 blur-3xl"
        style={{
          transform: `translate(calc(-50% + ${parallax.x * 0.15}px), ${parallax.y * 0.12}px)`,
        }}
      />
    </div>
  );
}
