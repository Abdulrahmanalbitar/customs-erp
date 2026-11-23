import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { betaTool, betaJSONSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/beta/json-schema';
import { db } from './db';
import { OPEN_STATUSES, DECL_STATUS, SHIP_STATUS, SHIP_ACTIVE } from './constants';
import { getAlerts } from './alerts';

export const AI_MODEL = process.env.AI_MODEL || 'claude-opus-5-5';
// Server-side fallback: if the main model declines, the API re-runs the request on a suitable model.
const FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' };

export function aiEnabled() {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let _client;
function client() {
  if (!_client) _client = new Anthropic();
  return _client;
}

const SYSTEM = `أنت مساعد ذكي داخل نظام ERP لمكتب تخليص جمركي في سوريا.
تجيب دائماً بالعربية وبأسلوب مهني ومختصر، وتستخدم الأدوات المتاحة لقراءة بيانات المكتب الحقيقية (عملاء، معاملات، شحنات، فواتير، إحصاءات) قبل الإجابة عن أي سؤال يخص البيانات.
لا تخترع أرقاماً: إن لم تجد المعلومة في الأدوات فقل ذلك.
لديك خبرة في الإجراءات الجمركية السورية، والبنود الجمركية (HS)، والمستندات المطلوبة (فاتورة تجارية، بوليصة، شهادة منشأ، إجازة استيراد...)، وحساب الرسوم، ومصطلحات الشحن (ETA، ETD، B/L، FCL، LCL، CIF، FOB).
عند ذكر معاملة أو شحنة أو عميل أضف رابطاً داخلياً بصيغة Markdown مثل [CL-2026-00001](/declarations/1) أو [الشحنة](/shipments/3) أو [العميل](/clients/2).
نسّق الإجابة بفقرات قصيرة وقوائم عند الحاجة.`;

const j = (x) => JSON.stringify(x, null, 0);

function buildTools() {
  return [
    betaTool({
      name: 'office_overview',
      description: 'ملخص فوري لحالة المكتب: عدد المعاملات المفتوحة حسب المرحلة، الشحنات النشطة، ديون العملاء، إيرادات ومقبوضات الشهر الحالي، والتنبيهات الذكية.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      run: async () => {
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const [byStatus, ships, due, rev, pays, alerts] = await Promise.all([
          db.declaration.groupBy({ by: ['status'], where: { status: { in: OPEN_STATUSES } }, _count: true }),
          db.shipment.groupBy({ by: ['status'], where: { status: { in: SHIP_ACTIVE } }, _count: true }),
          db.invoice.findMany({ where: { status: { in: ['UNPAID', 'PARTIAL'] } }, select: { total: true, paid: true, currency: true } }),
          db.journalEntry.groupBy({ by: ['currency'], where: { account: 'REVENUE', date: { gte: monthStart } }, _sum: { credit: true, debit: true } }),
          db.payment.groupBy({ by: ['currency'], where: { createdAt: { gte: monthStart } }, _sum: { amount: true } }),
          getAlerts(),
        ]);
        const dueBy = {};
        for (const i of due) dueBy[i.currency] = (dueBy[i.currency] || 0) + i.total - i.paid;
        return j({
          openDeclarationsByStage: byStatus.map((s) => ({ stage: DECL_STATUS[s.status]?.label, count: s._count })),
          activeShipments: ships.map((s) => ({ status: SHIP_STATUS[s.status]?.label, count: s._count })),
          receivablesByCurrency: dueBy,
          revenueThisMonth: rev.map((r) => ({ currency: r.currency, amount: (r._sum.credit || 0) - (r._sum.debit || 0) })),
          collectedThisMonth: pays.map((p) => ({ currency: p.currency, amount: p._sum.amount })),
          alerts: alerts.map((a) => `${a.title} – ${a.text} (${a.href})`),
        });
      },
    }),
    betaTool({
      name: 'search_declarations',
      description: 'بحث في المعاملات الجمركية بالنص (مرجع، رقم بيان، بضاعة، حاوية، اسم عميل) و/أو الحالة. يعيد حتى 25 نتيجة مع تفاصيلها والمستندات الناقصة.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'نص البحث، اتركه فارغاً لعرض الكل' },
          status: { type: 'string', enum: ['ANY', 'OPEN', ...Object.keys(DECL_STATUS)] },
        },
        required: ['query', 'status'],
        additionalProperties: false,
      },
      run: async ({ query, status }) => {
        const where = {};
        if (query) where.OR = [{ refNo: { contains: query } }, { declNo: { contains: query } }, { goods: { contains: query } }, { containerNo: { contains: query } }, { client: { name: { contains: query } } }];
        if (status === 'OPEN') where.status = { in: OPEN_STATUSES };
        else if (status && status !== 'ANY') where.status = status;
        const list = await db.declaration.findMany({ where, include: { client: true, employee: true, documents: true }, orderBy: { id: 'desc' }, take: 25 });
        return j(list.map((d) => ({
          link: `/declarations/${d.id}`, ref: d.refNo, declNo: d.declNo, client: d.client.name, type: d.type, office: d.customsOffice,
          goods: d.goods, hs: d.hsCode, value: `${d.goodsValue} ${d.currency}`, duty: d.dutyAmount, stage: DECL_STATUS[d.status]?.label,
          broker: d.employee?.name, priority: d.priority, opened: d.openedAt.toISOString().slice(0, 10),
          missingDocs: d.documents.filter((x) => !x.received).map((x) => x.kind),
        })));
      },
    }),
    betaTool({
      name: 'search_shipments',
      description: 'بحث في الشحنات (رقم تتبع، حاوية، بوليصة، سفينة، عميل) مع الحالة وموعد الوصول وآخر حدث.',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string' }, activeOnly: { type: 'boolean' } },
        required: ['query', 'activeOnly'],
        additionalProperties: false,
      },
      run: async ({ query, activeOnly }) => {
        const where = {};
        if (query) where.OR = [{ trackingNo: { contains: query } }, { containerNo: { contains: query } }, { blNo: { contains: query } }, { vessel: { contains: query } }, { client: { name: { contains: query } } }];
        if (activeOnly) where.status = { in: SHIP_ACTIVE };
        const list = await db.shipment.findMany({ where, include: { client: true, events: { orderBy: { at: 'desc' }, take: 1 } }, orderBy: { id: 'desc' }, take: 25 });
        return j(list.map((s) => ({
          link: `/shipments/${s.id}`, tracking: s.trackingNo, client: s.client.name, mode: s.mode, route: `${s.originPort} → ${s.destPort}`,
          vessel: s.vessel, container: s.containerNo, status: SHIP_STATUS[s.status]?.label, etd: s.etd?.toISOString().slice(0, 10), eta: s.eta?.toISOString().slice(0, 10),
          lastEvent: s.events[0] ? `${s.events[0].location || ''} ${s.events[0].note || ''}` : null,
        })));
      },
    }),
    betaTool({
      name: 'client_account',
      description: 'ملف عميل: بياناته، رصيده المستحق بكل عملة، آخر الفواتير والدفعات، ومعاملاته المفتوحة. ابحث بالاسم.',
      inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'], additionalProperties: false },
      run: async ({ name }) => {
        const c = await db.client.findFirst({
          where: { name: { contains: name } },
          include: {
            invoices: { orderBy: { id: 'desc' }, take: 15 },
            payments: { orderBy: { id: 'desc' }, take: 10 },
            declarations: { where: { status: { in: OPEN_STATUSES } } },
          },
        });
        if (!c) return 'لم يتم العثور على العميل';
        const bal = {};
        for (const i of c.invoices.filter((x) => x.status !== 'VOID')) bal[i.currency] = (bal[i.currency] || 0) + i.total - i.paid;
        return j({
          link: `/clients/${c.id}`, name: c.name, phone: c.phone, balance: bal,
          invoices: c.invoices.map((i) => ({ n: i.number, total: i.total, paid: i.paid, cur: i.currency, status: i.status, date: i.createdAt.toISOString().slice(0, 10) })),
          payments: c.payments.map((p) => ({ amount: p.amount, cur: p.currency, method: p.method, date: p.createdAt.toISOString().slice(0, 10) })),
          openDeclarations: c.declarations.map((d) => ({ ref: d.refNo, link: `/declarations/${d.id}`, stage: DECL_STATUS[d.status]?.label })),
        });
      },
    }),
    betaTool({
      name: 'lookup_tariff',
      description: 'البحث في جدول البنود الجمركية المسجل في النظام (رقم البند أو وصف البضاعة) مع نسب الرسوم.',
      inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false },
      run: async ({ query }) => {
        const r = await db.hsRate.findMany({ where: { OR: [{ hsCode: { startsWith: query } }, { description: { contains: query } }] }, take: 20 });
        return r.length ? j(r) : 'لا توجد بنود مطابقة في الجدول المحلي';
      },
    }),
  ];
}

/** Chat with tool access to the office data. messages: [{role, content: string}] */
export async function chat(messages) {
  const final = await client().beta.messages.toolRunner({
    model: AI_MODEL,
    max_tokens: 16000,
    output_config: { effort: 'medium' },
    system: SYSTEM,
    tools: buildTools(),
    messages: messages.slice(-20).map((m) => ({ role: m.role, content: String(m.content) })),
    max_iterations: 8,
    ...FALLBACK,
  });
  if (final.stop_reason === 'refusal') return 'عذراً، لا أستطيع المساعدة في هذا الطلب.';
  return final.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim() || '...';
}

const HS_SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          hsCode: { type: 'string', description: 'رمز النظام المنسق بصيغة 0000.00 أو أطول' },
          description: { type: 'string', description: 'وصف البند بالعربية' },
          confidence: { type: 'string', enum: ['عالية', 'متوسطة', 'منخفضة'] },
          reason: { type: 'string' },
        },
        required: ['hsCode', 'description', 'confidence', 'reason'],
        additionalProperties: false,
      },
    },
    requiredDocs: { type: 'array', items: { type: 'string' }, description: 'المستندات أو الموافقات المتوقعة لهذه البضاعة في سوريا' },
    notes: { type: 'string', description: 'ملاحظات مهمة: قيود، موافقات وزارية، مواصفات' },
  },
  required: ['suggestions', 'requiredDocs', 'notes'],
  additionalProperties: false,
};

/** Suggest HS codes for a goods description. */
export async function suggestHs(goods, origin) {
  const res = await client().beta.messages.parse({
    model: AI_MODEL,
    max_tokens: 8000,
    output_config: { effort: 'low', format: betaJSONSchemaOutputFormat(HS_SCHEMA) },
    system: 'أنت خبير تصنيف جمركي (النظام المنسق HS) في سوريا. اقترح حتى 3 بنود مرتبة حسب الأرجحية. نبّه أن الاقتراح استرشادي ويجب التحقق من التعرفة الرسمية.',
    messages: [{ role: 'user', content: `وصف البضاعة: ${goods}\nبلد المنشأ: ${origin || 'غير محدد'}` }],
    ...FALLBACK,
  });
  if (res.stop_reason === 'refusal' || !res.parsed_output) throw new Error('تعذر الحصول على اقتراح');
  return res.parsed_output;
}

const EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    documentType: { type: 'string', description: 'نوع المستند: فاتورة تجارية، بوليصة شحن، قائمة تعبئة، شهادة منشأ...' },
    supplier: { type: 'string' },
    consignee: { type: 'string' },
    goods: { type: 'string', description: 'وصف مختصر للبضاعة بالعربية' },
    hsCode: { type: 'string' },
    origin: { type: 'string', description: 'بلد المنشأ بالعربية' },
    goodsValue: { type: 'number' },
    currency: { type: 'string', enum: ['USD', 'SYP', 'EUR', 'OTHER'] },
    weight: { type: 'number', description: 'الوزن الإجمالي بالكيلوغرام' },
    packages: { type: 'integer' },
    containerNo: { type: 'string' },
    billOfLading: { type: 'string' },
    vessel: { type: 'string' },
    portOfLoading: { type: 'string' },
    portOfDischarge: { type: 'string' },
    invoiceNumber: { type: 'string' },
    summary: { type: 'string', description: 'ملخص من سطرين بالعربية' },
  },
  required: ['documentType', 'goods', 'summary'],
  additionalProperties: false,
};

/** Read a shipping document (PDF or image) and extract declaration fields. */
export async function extractDocument(buffer, mimeType) {
  const data = buffer.toString('base64');
  const block = mimeType === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
    : { type: 'image', source: { type: 'base64', media_type: mimeType, data } };
  const res = await client().beta.messages.parse({
    model: AI_MODEL,
    max_tokens: 8000,
    output_config: { effort: 'low', format: betaJSONSchemaOutputFormat(EXTRACT_SCHEMA) },
    system: 'استخرج بيانات مستند الشحن بدقة. اترك الحقل فارغاً إن لم يكن موجوداً ولا تخمّن الأرقام.',
    messages: [{ role: 'user', content: [block, { type: 'text', text: 'استخرج حقول البيان الجمركي من هذا المستند.' }] }],
    ...FALLBACK,
  });
  if (res.stop_reason === 'refusal' || !res.parsed_output) throw new Error('تعذرت قراءة المستند');
  return res.parsed_output;
}
