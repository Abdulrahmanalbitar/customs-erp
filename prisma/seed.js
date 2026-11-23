// Demo data so every screen has something to show. Run: npm run setup
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const db = new PrismaClient(process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DIRECT_URL ? { datasources: { db: { url: process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DIRECT_URL } } } : undefined);

const DAY = 864e5;
const ago = (d, h = 10) => { const x = new Date(Date.now() - d * DAY); x.setHours(h, 0, 0, 0); return x; };
const ahead = (d) => new Date(Date.now() + d * DAY);
const pick = (a, i) => a[i % a.length];
const Y = new Date().getFullYear();
const pad = (n) => String(n).padStart(5, '0');

async function post(lines, currency, description, refType, refId, date) {
  for (const l of lines) {
    if (!l.debit && !l.credit) continue;
    await db.journalEntry.create({ data: { account: l.account, debit: l.debit || 0, credit: l.credit || 0, currency, description, refType, refId, date } });
  }
}

async function main() {
  if (await db.user.count()) {
    console.log('Database already seeded, skipping.');
    return;
  }
  const pw = (p) => bcrypt.hashSync(p, 10);

  const emps = await Promise.all([
    db.employee.create({ data: { name: 'أحمد الخطيب', jobTitle: 'مخلّص جمركي أول', phone: '0933000001', salary: 350 } }),
    db.employee.create({ data: { name: 'سامر يوسف', jobTitle: 'مخلّص جمركي', phone: '0933000002', salary: 280 } }),
    db.employee.create({ data: { name: 'ريم حداد', jobTitle: 'محاسبة', phone: '0933000003', salary: 300 } }),
    db.employee.create({ data: { name: 'خالد المصري', jobTitle: 'معقّب', phone: '0933000004', salary: 220 } }),
  ]);
  const [e1, e2, e3, e4] = emps;

  await db.user.createMany({
    data: [
      { username: 'admin', name: 'مدير النظام', role: 'ADMIN', password: pw('admin123') },
      { username: 'accountant', name: 'ريم حداد', role: 'ACCOUNTANT', password: pw('123456'), employeeId: e3.id },
      { username: 'broker', name: 'أحمد الخطيب', role: 'BROKER', password: pw('123456'), employeeId: e1.id },
      { username: 'cashier', name: 'الكاشير', role: 'CASHIER', password: pw('123456') },
    ],
  });

  await db.setting.createMany({
    data: [
      { key: 'officeName', value: 'مكتب الأمانة للتخليص الجمركي' },
      { key: 'officePhone', value: '+963 41 000 000' },
      { key: 'officeAddress', value: 'اللاذقية – شارع المرفأ' },
    ],
  });

  await db.service.createMany({
    data: [
      { name: 'أتعاب تخليص جمركي – حاوية', price: 150 },
      { name: 'أتعاب تخليص – سيارة', price: 100 },
      { name: 'أتعاب تخليص – طرد صغير', price: 40 },
      { name: 'تنظيم بيان جمركي', price: 25 },
      { name: 'ترجمة مستندات', price: 15 },
      { name: 'تصديق شهادة منشأ', price: 20 },
      { name: 'متابعة معاينة', price: 30 },
      { name: 'استشارة جمركية', price: 10 },
    ],
  });

  // Sample tariff lines – illustrative rates only, must be checked against the official tariff.
  await db.hsRate.createMany({
    data: [
      { hsCode: '8708.99', description: 'قطع غيار وأجزاء سيارات', dutyRate: 20, otherRate: 5 },
      { hsCode: '8541.43', description: 'ألواح طاقة شمسية (خلايا مجمعة)', dutyRate: 1, otherRate: 2 },
      { hsCode: '1006.30', description: 'أرز مبيض', dutyRate: 1, otherRate: 2 },
      { hsCode: '8471.30', description: 'حواسيب محمولة', dutyRate: 5, otherRate: 3 },
      { hsCode: '8517.13', description: 'هواتف ذكية', dutyRate: 10, otherRate: 5 },
      { hsCode: '3004.90', description: 'أدوية معبأة', dutyRate: 1, otherRate: 1 },
      { hsCode: '8418.10', description: 'برادات منزلية', dutyRate: 30, otherRate: 5 },
      { hsCode: '6109.10', description: 'قمصان قطنية (تي شيرت)', dutyRate: 30, otherRate: 5 },
      { hsCode: '7214.20', description: 'قضبان حديد تسليح', dutyRate: 5, otherRate: 2 },
      { hsCode: '3901.10', description: 'بولي إيثيلين أولي', dutyRate: 1, otherRate: 2 },
      { hsCode: '8703.23', description: 'سيارات سياحية 1500–3000cc', dutyRate: 40, otherRate: 10 },
      { hsCode: '0901.21', description: 'بن محمص', dutyRate: 20, otherRate: 5 },
    ],
  });

  const clientsData = [
    ['شركة النور للتجارة', 'COMPANY', '0944111222', 'دمشق – المزة'],
    ['مؤسسة الشام للاستيراد', 'COMPANY', '0955333444', 'حلب – الشيخ نجار'],
    ['شركة الساحل للطاقة', 'COMPANY', '0988777666', 'طرطوس'],
    ['مجموعة الفيحاء الطبية', 'COMPANY', '0933222111', 'دمشق – كفرسوسة'],
    ['شركة البناء الحديث', 'COMPANY', '0999555444', 'حمص'],
    ['محمد العلي', 'PERSON', '0966555666', 'اللاذقية'],
  ];
  const clients = [];
  for (const [name, type, phone, address] of clientsData) {
    clients.push(await db.client.create({ data: { name, type, phone, address, taxNumber: type === 'COMPANY' ? String(100000 + clients.length * 731) : null } }));
  }

  const goods = [
    ['قطع غيار سيارات', '8708.99', 'الصين', 42000],
    ['مواد غذائية – أرز', '1006.30', 'الهند', 21000],
    ['ألواح طاقة شمسية', '8541.43', 'الصين', 65000],
    ['أدوية ومستلزمات طبية', '3004.90', 'تركيا', 38000],
    ['حديد تسليح', '7214.20', 'تركيا', 54000],
    ['حواسيب محمولة', '8471.30', 'الإمارات', 30000],
    ['برادات منزلية', '8418.10', 'تركيا', 26000],
    ['بولي إيثيلين', '3901.10', 'السعودية', 47000],
  ];
  const offices = ['أمانة جمارك اللاذقية', 'أمانة جمارك طرطوس', 'أمانة جمارك نصيب', 'أمانة جمارك مطار دمشق الدولي'];
  const statuses = ['DELIVERED', 'RELEASED', 'DELIVERED', 'RELEASED', 'DUTIES_PAID', 'ASSESSED', 'INSPECTION', 'SUBMITTED', 'DOCS_PENDING', 'RECEIVED', 'INSPECTION', 'SUBMITTED'];
  const flow = ['RECEIVED', 'DOCS_PENDING', 'SUBMITTED', 'INSPECTION', 'ASSESSED', 'DUTIES_PAID', 'RELEASED', 'DELIVERED'];
  const docKinds = ['فاتورة تجارية', 'بوليصة شحن', 'شهادة منشأ', 'قائمة تعبئة'];

  let invN = 0, decN = 0;
  const decls = [];
  for (let i = 0; i < 12; i++) {
    const [g, hs, origin, value] = pick(goods, i);
    const status = statuses[i];
    const opened = ago(170 - i * 14 + (i > 8 ? 120 : 0) - (i > 8 ? 110 : 0));
    const stepIdx = flow.indexOf(status);
    const sea = i % 4 !== 3;
    const d = await db.declaration.create({
      data: {
        refNo: `CL-${Y}-${pad(++decN)}`, declNo: stepIdx >= 2 ? String(4500 + i * 37) : null, type: i === 7 ? 'EXPORT' : 'IMPORT',
        customsOffice: sea ? pick(offices, i % 2) : offices[2], clientId: pick(clients, i).id, employeeId: pick([e1, e2, e1, e4], i).id,
        goods: g, hsCode: hs, origin, transport: sea ? 'SEA' : 'LAND', containerNo: sea ? `MSCU${1234560 + i * 97}` : null,
        billOfLading: sea ? `MEDU${998800 + i * 13}` : null, weight: 12000 + i * 1500, packages: 200 + i * 40, goodsValue: value,
        dutyAmount: Math.round(value * 0.08), status, openedAt: opened, releasedAt: stepIdx >= 6 ? new Date(opened.getTime() + 9 * DAY) : null,
        priority: i === 10 ? 'URGENT' : i === 8 ? 'HIGH' : 'NORMAL', dueDate: i === 10 ? ahead(1) : null,
        events: { create: flow.slice(0, stepIdx + 1).map((s, k) => ({ status: s, by: k ? 'أحمد الخطيب' : 'مدير النظام', note: k ? null : 'فتح المعاملة', createdAt: new Date(opened.getTime() + k * DAY) })) },
        documents: { create: docKinds.map((kind, k) => ({ kind, received: stepIdx >= 2 || k < 2 })) },
      },
    });
    decls.push(d);

    // finished files get invoiced (with on-behalf expenses and payments)
    if (stepIdx >= 5) {
      const when = new Date(opened.getTime() + 8 * DAY);
      const portFees = 180 + i * 10, transport = 120;
      for (const [cat, amt] of [['رسوم مرفأ / أرضيات', portFees], ['أجور نقل', transport]]) {
        const e = await db.expense.create({ data: { category: cat, amount: amt, onBehalf: true, billed: true, declarationId: d.id, createdAt: when } });
        await post([{ account: 'DISBURSEMENTS', debit: amt }, { account: 'CASH', credit: amt }], 'USD', `مصروف: ${cat}`, 'EXPENSE', e.id, when);
      }
      const fee = 150 + (i % 3) * 25;
      const total = fee + portFees + transport;
      const inv = await db.invoice.create({
        data: {
          number: `INV-${Y}-${pad(++invN)}`, clientId: d.clientId, declarationId: d.id, currency: 'USD', subtotal: total, total, createdAt: when,
          items: { create: [
            { description: `أتعاب تخليص جمركي – معاملة ${d.refNo}`, kind: 'SERVICE', qty: 1, price: fee, total: fee },
            { description: 'رسوم مرفأ / أرضيات', kind: 'DISBURSEMENT', qty: 1, price: portFees, total: portFees },
            { description: 'أجور نقل', kind: 'DISBURSEMENT', qty: 1, price: transport, total: transport },
          ] },
        },
      });
      await post([{ account: 'RECEIVABLE', debit: total }, { account: 'REVENUE', credit: fee }, { account: 'DISBURSEMENTS', credit: portFees + transport }], 'USD', `فاتورة ${inv.number}`, 'INVOICE', inv.id, when);
      const paid = i % 4 === 0 ? total * 0.5 : i === 5 ? 0 : total;
      if (paid > 0) {
        const pDate = new Date(when.getTime() + 3 * DAY);
        const p = await db.payment.create({ data: { invoiceId: inv.id, clientId: d.clientId, amount: paid, method: i % 3 ? 'CASH' : 'TRANSFER', createdAt: pDate } });
        await post([{ account: i % 3 ? 'CASH' : 'BANK', debit: paid }, { account: 'RECEIVABLE', credit: paid }], 'USD', `قبض دفعة #${p.id}`, 'PAYMENT', p.id, pDate);
      }
      await db.invoice.update({ where: { id: inv.id }, data: { paid, status: paid >= total ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID' } });
    }
  }

  // small POS sales spread across months
  let posN = 0;
  for (let m = 0; m < 24; m++) {
    const when = ago(m * 7 + 1, 11 + (m % 6));
    const amt = pick([25, 40, 15, 55, 30, 20], m);
    const c = pick(clients, m + 2);
    const inv = await db.invoice.create({
      data: { number: `POS-${Y}-${pad(++posN)}`, clientId: c.id, currency: 'USD', subtotal: amt, total: amt, paid: amt, status: 'PAID', source: 'POS', createdAt: when,
        items: { create: [{ description: pick(['تنظيم بيان جمركي', 'أتعاب تخليص – طرد صغير', 'ترجمة مستندات', 'تصديق شهادة منشأ'], m), qty: 1, price: amt, total: amt }] } },
    });
    await post([{ account: 'RECEIVABLE', debit: amt }, { account: 'REVENUE', credit: amt }], 'USD', `فاتورة ${inv.number}`, 'INVOICE', inv.id, when);
    const p = await db.payment.create({ data: { invoiceId: inv.id, clientId: c.id, amount: amt, method: 'CASH', createdAt: when } });
    await post([{ account: 'CASH', debit: amt }, { account: 'RECEIVABLE', credit: amt }], 'USD', `قبض دفعة #${p.id}`, 'PAYMENT', p.id, when);
  }

  // office expenses and salaries for the last 6 months
  for (let m = 0; m < 6; m++) {
    const when = ago(m * 30 + 3);
    for (const [cat, amt] of [['إيجار', 250], ['كهرباء وماء وإنترنت', 60 + m * 5], ['قرطاسية وطباعة', 25], ['محروقات وتنقلات', 70]]) {
      const e = await db.expense.create({ data: { category: cat, amount: amt, createdAt: when } });
      await post([{ account: 'EXPENSE', debit: amt }, { account: 'CASH', credit: amt }], 'USD', `مصروف: ${cat}`, 'EXPENSE', e.id, when);
    }
    const month = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}`;
    for (const e of emps) {
      const sp = await db.salaryPayment.create({ data: { employeeId: e.id, month, amount: e.salary, createdAt: when } });
      await post([{ account: 'SALARIES', debit: e.salary }, { account: 'CASH', credit: e.salary }], 'USD', `راتب ${e.name} عن ${month}`, 'SALARY', sp.id, when);
    }
  }
  await post([{ account: 'CASH', debit: 15000 }, { account: 'CAPITAL', credit: 15000 }], 'USD', 'رصيد افتتاحي', 'MANUAL', null, ago(185));

  // shipments
  const ships = [
    { route: ['شنغهاي', 'اللاذقية'], status: 'IN_TRANSIT', etd: -18, eta: 9, carrier: 'COSCO', vessel: 'COSCO PRIDE', d: 2, mode: 'SEA' },
    { route: ['نينغبو', 'طرطوس'], status: 'TRANSSHIPMENT', etd: -24, eta: 4, carrier: 'MSC', vessel: 'MSC AURORA', d: 6, mode: 'SEA' },
    { route: ['مرسين', 'اللاذقية'], status: 'ARRIVED', etd: -5, eta: -1, carrier: 'Arkas', vessel: 'ARKAS LINE 7', d: 10, mode: 'SEA' },
    { route: ['جبل علي', 'اللاذقية'], status: 'DEPARTED', etd: -3, eta: 16, carrier: 'CMA CGM', vessel: 'CMA CGM TIGRIS', d: 11, mode: 'SEA' },
    { route: ['إسطنبول', 'مطار دمشق'], status: 'AT_CUSTOMS', etd: -2, eta: -1, carrier: 'Turkish Cargo', vessel: 'TK6402', d: 5, mode: 'AIR' },
    { route: ['العقبة', 'معبر نصيب'], status: 'DELAYED', etd: -10, eta: -2, carrier: 'نقل بري', vessel: 'قافلة 12', d: 8, mode: 'LAND' },
    { route: ['مومباي', 'طرطوس'], status: 'BOOKED', etd: 5, eta: 30, carrier: 'Maersk', vessel: 'MAERSK KENSINGTON', d: 9, mode: 'SEA' },
  ];
  let t = 0;
  for (const s of ships) {
    const decl = decls[s.d];
    const etd = ahead(s.etd), eta = ahead(s.eta);
    const ev = [{ status: 'BOOKED', location: s.route[0], note: 'تم الحجز لدى الناقل', at: new Date(etd.getTime() - 6 * DAY) }];
    if (s.etd < 0) ev.push({ status: 'LOADED', location: s.route[0], note: 'تم تحميل الحاوية', at: new Date(etd.getTime() - DAY) }, { status: 'DEPARTED', location: s.route[0], note: 'غادرت السفينة', at: etd });
    if (s.status === 'TRANSSHIPMENT') ev.push({ status: 'TRANSSHIPMENT', location: 'بورسعيد', note: 'إعادة شحن', at: ahead(-3) });
    if (s.status === 'IN_TRANSIT') ev.push({ status: 'IN_TRANSIT', location: 'المحيط الهندي', note: 'في الطريق', at: ahead(-6) });
    if (['ARRIVED', 'AT_CUSTOMS'].includes(s.status)) ev.push({ status: 'ARRIVED', location: s.route[1], note: 'وصلت', at: eta });
    if (s.status === 'AT_CUSTOMS') ev.push({ status: 'AT_CUSTOMS', location: s.route[1], note: 'بانتظار الكشف', at: new Date() });
    if (s.status === 'DELAYED') ev.push({ status: 'DELAYED', location: 'الحدود', note: 'تأخير في العبور بسبب الازدحام', at: ahead(-1) });
    await db.shipment.create({
      data: {
        trackingNo: `TRK${String(Y).slice(2)}${['A7K2Q', 'B3M9X', 'C5P1L', 'D8R4T', 'E2W6Z', 'F9H3N', 'G4J8V'][t]}${t}`,
        clientId: decl.clientId, declarationId: decl.id, mode: s.mode, carrier: s.carrier, vessel: s.vessel, voyage: s.mode === 'SEA' ? `${120 + t}W` : null,
        containerNo: s.mode === 'SEA' ? decl.containerNo || `TGHU${5550000 + t * 31}` : null, containerType: s.mode === 'SEA' ? "40' HC" : null,
        blNo: decl.billOfLading, originPort: s.route[0], destPort: s.route[1], etd, eta,
        atd: s.etd < 0 ? etd : null, ata: ['ARRIVED', 'AT_CUSTOMS'].includes(s.status) ? eta : null,
        goods: decl.goods, weight: decl.weight, status: s.status, events: { create: ev },
      },
    });
    t++;
  }

  // a quote
  await db.quote.create({
    data: {
      number: `QT-${Y}-00001`, clientId: clients[2].id, total: 3270, status: 'SENT', validUntil: ahead(10),
      notes: 'ألواح طاقة شمسية · القيمة الجمركية CIF تقديرية',
      items: { create: [{ description: 'رسوم جمركية تقديرية (1%)', qty: 1, price: 670 }, { description: 'رسوم مرفأ وأرضيات', qty: 1, price: 250 }, { description: 'نقل', qty: 1, price: 200 }, { description: 'أتعاب التخليص الجمركي', qty: 1, price: 150 }, { description: 'متابعة معاينة', qty: 1, price: 2000 }] },
    },
  });

  await db.activityLog.createMany({
    data: [
      { userName: 'أحمد الخطيب', action: 'نقل المعاملة إلى «معاينة»', entity: 'declaration', entityId: decls[10].id, details: decls[10].refNo, createdAt: ago(0, 9) },
      { userName: 'ريم حداد', action: 'قبض دفعة', details: 'INV · 450 USD', createdAt: ago(0, 8) },
      { userName: 'مدير النظام', action: 'أضاف شحنة جديدة', details: 'مومباي ← طرطوس', createdAt: ago(1, 15) },
    ],
  });

  console.log('Seeded demo data. Login: admin / admin123');
}

main().finally(() => db.$disconnect());
