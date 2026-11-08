// 서버용 사주 계산 (public/index.html 의 계산 로직과 동일)
export const STEM_H = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
export const STEM_K = ['갑','을','병','정','무','기','경','신','임','계'];
export const STEM_EL = [0,0,1,1,2,2,3,3,4,4];
export const BR_EL = [4,2,0,0,2,1,1,2,3,3,2,4];
export const EL_NAME = ['목(木)','화(火)','토(土)','금(金)','수(水)'];

export const DAY_MASTER = [
  { img: '곧게 뻗은 큰 나무', kw: ['리더십','정의감','뚝심'], desc: '한번 정한 길은 끝까지 가는 직진형. 책임감이 강하지만 고집도 만만치 않다.' },
  { img: '바람에 휘는 덩굴꽃', kw: ['유연함','적응력','섬세함'], desc: '부드럽지만 끈질긴 생명력. 상대에 맞춰주는 듯하면서 결국 원하는 걸 얻어낸다.' },
  { img: '한낮의 태양', kw: ['열정','솔직함','존재감'], desc: '숨기는 게 없는 밝은 에너지. 분위기를 바꾸지만 식을 때도 확실하다.' },
  { img: '어둠을 밝히는 촛불', kw: ['다정함','집중력','헌신'], desc: '겉은 차분해도 속은 뜨거운 타입. 한 사람에게 깊이 몰입하는 순정파.' },
  { img: '묵직한 큰 산', kw: ['듬직함','포용력','신뢰'], desc: '흔들리지 않는 안정감. 말수는 적어도 곁에 있으면 든든하다.' },
  { img: '씨앗을 품은 논밭', kw: ['실속','배려','현실감각'], desc: '조용히 챙겨주는 생활형 다정함. 계산이 빠르지만 정이 많다.' },
  { img: '단단한 바위와 무쇠', kw: ['결단력','의리','추진력'], desc: '아닌 건 아닌 칼 같은 성격. 내 사람에게는 끝까지 의리를 지킨다.' },
  { img: '세공된 보석', kw: ['감각','완벽주의','자존심'], desc: '예민하고 세련된 안목. 상처받기 쉽지만 그만큼 빛난다.' },
  { img: '끝없이 넓은 바다', kw: ['스케일','지혜','자유로움'], desc: '생각의 폭이 넓고 흐름을 읽는 전략가. 얽매이는 걸 싫어한다.' },
  { img: '촉촉한 봄비와 이슬', kw: ['감수성','직관','공감력'], desc: '말하지 않아도 마음을 읽는 섬세함. 조용히 스며드는 매력.' }
];

function jdn(y, m, d) {
  const a = Math.floor((14 - m) / 12), Y = y + 4800 - a, M = m + 12 * a - 3;
  return d + Math.floor((153 * M + 2) / 5) + 365 * Y + Math.floor(Y / 4) - Math.floor(Y / 100) + Math.floor(Y / 400) - 32045;
}
const TERMS = [[1,6,1],[2,4,2],[3,6,3],[4,5,4],[5,6,5],[6,6,6],[7,7,7],[8,8,8],[9,8,9],[10,8,10],[11,7,11],[12,7,0]];

export function calcSaju(dateStr, hr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const sy = (m < 2 || (m === 2 && d < 4)) ? y - 1 : y;
  const yi = ((sy - 4) % 60 + 60) % 60, ys = yi % 10, yb = yi % 12;
  let mb = 0;
  for (const t of TERMS) if (m > t[0] || (m === t[0] && d >= t[1])) mb = t[2];
  const ms = ((ys % 5) * 2 + 2 + (mb - 2 + 12) % 12) % 10;
  const di = ((jdn(y, m, d) + 49) % 60 + 60) % 60, ds = di % 10, db = di % 12;
  const pillars = [[ys, yb], [ms, mb], [ds, db]];
  if (hr !== null) pillars.push([((ds % 5) * 2 + hr) % 10, hr]);
  const el = [0, 0, 0, 0, 0];
  for (const [s, b] of pillars) { el[STEM_EL[s]]++; el[BR_EL[b]]++; }
  return { dm: ds, el };
}
