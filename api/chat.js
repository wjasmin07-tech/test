import Anthropic from '@anthropic-ai/sdk';
import { calcSaju, DAY_MASTER, STEM_H, STEM_K, EL_NAME } from '../lib/saju.js';
import { CHARACTERS } from '../lib/characters.js';

const MODEL = 'claude-opus-5-5';
const VERDICTS = new Set(['천생연분', '운명적 끌림', '설레는 케미', '노력형 인연', '애증의 관계', '험난한 로맨스']);
const TAGS = new Set(['천간합', '상생 (내가 북돋움)', '상생 (상대가 북돋움)', '비화 (같은 기운)', '상극 (내가 주도)', '상극 (상대가 주도)',
  '일지 육합', '일지 삼합', '일지 충', '일지 원진', '같은 일지', '띠 육합', '띠 삼합', '띠 충', '띠 원진', '동갑내기 띠', '오행 보완']);
const MAX_TURNS = 20;      // 최근 메시지만 전달
const MAX_USER_LEN = 300;
const MAX_BOT_LEN = 1500;

// 스트림 끝에 붙이는 제어 표시 (클라이언트가 잘라내서 처리)
const MARK = '\u0000';

function str(v, max) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }
function validDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  return y >= 1900 && y <= 2030 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
}
function hourOf(v) { if (v === null || v === undefined || v === '') return null; const n = Number(v); return Number.isInteger(n) && n >= 0 && n <= 11 ? n : null; }
function bad(code, status = 400) { return Response.json({ error: code }, { status }); }

function cleanMessages(list) {
  if (!Array.isArray(list)) return null;
  let msgs = list.slice(-MAX_TURNS).map(m => ({
    role: m?.role === 'assistant' ? 'assistant' : 'user',
    content: str(m?.content, m?.role === 'assistant' ? MAX_BOT_LEN : MAX_USER_LEN)
  })).filter(m => m.content);
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return null;
  for (let i = 1; i < msgs.length; i++) if (msgs[i].role === msgs[i - 1].role) return null;
  return msgs;
}

function buildSystem(ch, chSaju, user, uSaju, compat) {
  const cdm = DAY_MASTER[chSaju.dm], udm = DAY_MASTER[uSaju.dm];
  const elStr = el => el.map((n, i) => `${EL_NAME[i]} ${n}`).join(', ');
  return `너는 드라마 「${ch.drama}」의 캐릭터 '${ch.name}'을(를) 연기하는 팬 롤플레이 대화 상대다. 사주 궁합 서비스 안에서 사용자와 대화하고 있다.

[캐릭터]
- 성격과 말투: ${ch.persona}
- 이 서비스에서 정한 사주: 일간 ${STEM_H[chSaju.dm]}${STEM_K[chSaju.dm]} (${cdm.img}) — ${cdm.desc} 키워드: ${cdm.kw.join(', ')}. 오행: ${elStr(chSaju.el)}.
- 이 캐릭터의 대표 대사(서비스 창작): "${ch.q}"

[대화 상대]
- 이름: ${user.name} (${user.gender === 'M' ? '남성' : '여성'})
- 일간 ${STEM_H[uSaju.dm]}${STEM_K[uSaju.dm]} (${udm.img}). 오행: ${elStr(uSaju.el)}.
- 두 사람의 궁합: ${compat.score}점 「${compat.verdict}」. 작용: ${compat.tags.join(', ') || '특별한 작용 없음'}.

[규칙]
- 항상 한국어로, 이 캐릭터의 말투와 성격 그대로 1~3문장으로 짧게 대답한다. 채팅 메시지처럼 자연스럽게.
- 행동 묘사는 꼭 필요할 때만 괄호로 아주 짧게 쓴다.
- 드라마 대본을 그대로 길게 인용하지 말고, 캐릭터다운 새로운 말로 대답한다.
- 사주·궁합 이야기가 나오면 위 정보를 근거로 캐릭터답게 풀어서 말한다.
- 캐릭터로서 대화하되, 실제 배우 본인인 척하지 않는다.
- 사용자가 캐릭터 대화와 무관한 작업(코드 작성, 긴 글 작성 등)을 요청하면 캐릭터답게 가볍게 거절하고 대화로 돌아온다.
- 사용자가 심각한 고민이나 위기를 털어놓으면 캐릭터 말투는 유지하되 진심으로 걱정하고, 필요하면 주변 사람이나 전문 기관의 도움을 받도록 권한다.`;
}

// AI 사용 가능 여부 확인용
export function GET() {
  return Response.json({ ai: Boolean(process.env.ANTHROPIC_API_KEY) });
}

export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) return bad('no_key', 503);

  let body;
  try { body = await req.json(); } catch { return bad('invalid_json'); }

  // 캐릭터: 등록된 캐릭터 또는 사용자가 만든 캐릭터
  let ch;
  if (body?.charId === 'custom') {
    const c = body.custom || {};
    if (!validDate(c.date)) return bad('invalid_char');
    const dm = DAY_MASTER[calcSaju(c.date, hourOf(c.hr)).dm];
    ch = {
      name: str(c.name, 12) || '나의 최애', drama: str(c.drama, 20) || '나만의 드라마', date: c.date, hr: hourOf(c.hr),
      q: `나는 ${dm.img} 같은 사람이야. ${dm.kw[0]}, 그게 나의 전부지.`,
      persona: `사용자가 직접 만든 캐릭터. 성향 키워드: ${dm.kw.join(', ')}. ${dm.desc} 다정한 존댓말.`
    };
  } else {
    ch = CHARACTERS[body?.charId];
    if (!ch) return bad('invalid_char');
  }

  const u = body?.user || {};
  if (!validDate(u.date)) return bad('invalid_user');
  const user = { name: str(u.name, 12) || '나', gender: u.gender === 'M' ? 'M' : 'F' };

  const c = body?.compat || {};
  const score = Number(c.score);
  if (!Number.isInteger(score) || score < 0 || score > 100 || !VERDICTS.has(c.verdict)) return bad('invalid_compat');
  const compat = { score, verdict: c.verdict, tags: Array.isArray(c.tags) ? c.tags.filter(t => TAGS.has(t)).slice(0, 6) : [] };

  const messages = cleanMessages(body?.messages);
  if (!messages) return bad('invalid_messages');

  const system = buildSystem(ch, calcSaju(ch.date, ch.hr ?? null), user, calcSaju(u.date, hourOf(u.hr)), compat);

  const client = new Anthropic(); // ANTHROPIC_API_KEY 환경변수 사용
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const ms = client.beta.messages.stream({
          model: MODEL,
          max_tokens: 4000,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          output_config: { effort: 'low' },
          system,
          messages
        });
        ms.on('text', t => controller.enqueue(enc.encode(t)));
        const msg = await ms.finalMessage();
        if (msg.stop_reason === 'refusal') controller.enqueue(enc.encode(MARK + 'refusal'));
      } catch (e) {
        let code = 'api';
        if (e instanceof Anthropic.AuthenticationError) code = 'auth';
        else if (e instanceof Anthropic.PermissionDeniedError) code = 'permission';
        else if (e instanceof Anthropic.RateLimitError) code = 'rate';
        else if (e instanceof Anthropic.APIConnectionError) code = 'connection';
        console.error('[chat] Claude API error:', code, e?.status, e?.message);
        controller.enqueue(enc.encode(MARK + 'error:' + code));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}
