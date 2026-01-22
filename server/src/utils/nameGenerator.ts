const adjectives = [
  "快乐",
  "软萌",
  "闪亮",
  "害羞",
  "元气",
  "慵懒",
  "咕噜",
  "蹦蹦",
  "炸毛",
  "小甜",
  "好奇",
  "呆萌",
  "超萌",
  "皮皮",
  "香香",
  "糯糯",
  "Q弹",
] as const;

const animals = [
  "柴犬",
  "猫咪",
  "仓鼠",
  "兔子",
  "浣熊",
  "狐狸",
  "水獭",
  "考拉",
  "熊猫",
  "刺猬",
  "小鹿",
  "企鹅",
  "海豹",
  "章鱼",
  "小熊",
  "松鼠",
  "龙猫",
] as const;

export function generateRandomName(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  if (Math.random() < 0.08) {
    const num = Math.floor(Math.random() * 89) + 10;
    return `${adj}${animal}${num}`;
  }
  const base = `${adj}${animal}`;
  const timestamp = Date.now().toString().slice(-4);
  return `${base}${timestamp}`;
}

export function generatePseudoEnglishName(): string {
  const syllables = [
    "la",
    "no",
    "ra",
    "mi",
    "ka",
    "ta",
    "le",
    "ve",
    "xo",
    "zi",
    "an",
    "el",
    "or",
    "un",
  ];
  const len = 2 + Math.floor(Math.random() * 2);
  let name = "";

  for (let i = 0; i < len; i++) {
    name += syllables[Math.floor(Math.random() * syllables.length)];
  }

  return name.charAt(0).toUpperCase() + name.slice(1);
}
const usedNames = new Set<string>();
export function generateUniqueName() {
  let name: string;
  do {
    name = generatePseudoEnglishName();
  } while (usedNames.has(name));
  usedNames.add(name);
  return name;
}
