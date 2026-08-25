/**
 * Real Incentive metrics flow — login like a user, ensure every metric is assigned,
 * drive ops/actuals, assert performance lines + last-slab rate.
 * Usage: node apps/api/scripts/incentive-flow-real-test.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

function loadRootEnv() {
  const envPath = path.resolve(__dirname, '../../../.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadRootEnv();

const API = process.env.E2E_API_URL ?? 'http://localhost:3333/api';
const EMAIL = process.env.E2E_USER_EMAIL ?? 'e2e.admin@laam.test';
const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'e2e.admin2026';
const DEVICE_ID = process.env.E2E_DEVICE_ID ?? 'e2e-device';
const TENANT = process.env.E2E_TENANT_SLUG ?? 'laam';
const STAMP = Date.now();
const PROBE_AGENT = `E2E Metric Probe ${STAMP}`;

const ALL_METRICS = [
  'order_count',
  'cross_sell_count',
  'return_ratio',
  'recovery_count',
  'survey_count',
  'channel_activity',
  'manual',
];

const results = [];

function ok(name, detail) {
  results.push({ name, pass: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail) {
  results.push({ name, pass: false, detail });
  console.error(`FAIL  ${name} — ${detail}`);
}

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Slug': TENANT,
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, deviceId: DEVICE_ID }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`login ${res.status}: ${text}`);
  const body = JSON.parse(text);
  if (!body.accessToken) throw new Error('login missing accessToken');
  return body.accessToken;
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Tenant-Slug': TENANT,
  };
}

async function json(method, urlPath, token, body) {
  const res = await fetch(`${API}${urlPath}`, {
    method,
    headers: headers(token),
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { res, data, text };
}

function yearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Mirrors incentive-calc last-crossed-slab rate (for live assertion). */
function lastSlabIncentive(slabs, actual) {
  const sorted = [...slabs].sort((a, b) => a.monthlyTarget - b.monthlyTarget);
  const qualifying = sorted.filter((s) => actual >= s.monthlyTarget);
  if (!qualifying.length) return { incentiveBdt: 0, prorataApplied: false };
  const best = qualifying[qualifying.length - 1];
  if (actual > best.monthlyTarget && best.monthlyTarget > 0) {
    return {
      incentiveBdt: Math.round((best.incentiveBdt * actual) / best.monthlyTarget),
      prorataApplied: true,
      slab: best,
    };
  }
  return { incentiveBdt: best.incentiveBdt, prorataApplied: false, slab: best };
}

async function ensureAssignment(token, plan, agentName) {
  const created = await json('POST', '/crm/incentive/assignments', token, {
    planId: plan.id,
    agentName,
    startsOn: `${yearMonth()}-01`,
    isActive: true,
    hrStatus: 'active',
  });
  if (![200, 201].includes(created.res.status)) {
    fail(`assign ${plan.metricType}`, `${created.res.status} ${created.text}`);
    return null;
  }
  ok(`assign ${plan.metricType}`, agentName);
  return created.data;
}

async function main() {
  console.log(`Incentive metrics real flow @ ${API} as ${EMAIL}`);
  const ym = yearMonth();
  const token = await login();
  ok('login', EMAIL);

  let overview = await json('GET', '/crm/incentive/overview', token);
  if (overview.res.status !== 200) {
    fail('overview', `${overview.res.status} ${overview.text}`);
    throw new Error('overview failed');
  }
  ok(
    'overview',
    `teams=${overview.data.teamCount} plans=${overview.data.planCount} assignments=${overview.data.assignmentCount}`,
  );

  let plans = (overview.data.plans ?? []).filter((p) => p.isActive);
  let assignments = (overview.data.assignments ?? []).filter((a) => a.isActive);
  const teams = overview.data.teams ?? [];

  // Ensure survey_count plan exists (seed may have been skipped for this org)
  if (!plans.some((p) => p.metricType === 'survey_count')) {
    const teamId = teams[0]?.id ?? plans[0]?.teamId;
    if (!teamId) {
      fail('survey_count plan', 'no team to attach');
    } else {
      const planRes = await json('POST', '/crm/incentive/plans', token, {
        name: `E2E Survey ${STAMP}`,
        teamId,
        metricType: 'survey_count',
        prorataAboveTop: true,
        slabs: [
          { label: '10', monthlyTarget: 10, incentiveBdt: 500 },
          { label: '20', monthlyTarget: 20, incentiveBdt: 1200 },
        ],
      });
      if (![200, 201].includes(planRes.res.status)) {
        fail('survey_count plan', `${planRes.res.status} ${planRes.text}`);
      } else {
        ok('survey_count plan', 'created');
        plans = [...plans, planRes.data];
      }
    }
  }

  const presentMetrics = new Set(plans.map((p) => p.metricType));
  for (const metric of ALL_METRICS) {
    if (presentMetrics.has(metric)) {
      ok(`metric plan present: ${metric}`, 'active plan found');
    } else {
      fail(`metric plan present: ${metric}`, 'missing active plan');
    }
  }

  // Local expectation check for last-crossed rate (450 between 390 and 520)
  const sampleSlabs = [
    { monthlyTarget: 390, incentiveBdt: 5000 },
    { monthlyTarget: 520, incentiveBdt: 7000 },
  ];
  const expect450 = lastSlabIncentive(sampleSlabs, 450);
  if (expect450.incentiveBdt !== Math.round((5000 * 450) / 390) || !expect450.prorataApplied) {
    fail('last-slab rate math', JSON.stringify(expect450));
  } else {
    ok('last-slab rate math', `450 → ৳${expect450.incentiveBdt}`);
  }

  const salary = overview.data?.salaryTemplate ?? {
    basicBdt: 15000,
    houseRentBdt: 5000,
    medicalBdt: 1000,
    conveyanceBdt: 1000,
    grossBdt: 22000,
    attendanceBonusBdt: 1000,
    lunchBdt: 1500,
    totalBdt: 24500,
  };
  const salarySave = await json('PATCH', '/crm/incentive/salary', token, {
    ...salary,
    payoutDay: 7,
    notes: `e2e payout ${STAMP}`,
  });
  if (salarySave.res.status !== 200 || salarySave.data?.payoutDay !== 7) {
    fail('salary payoutDay', `${salarySave.res.status} ${salarySave.text}`);
  } else {
    ok('salary payoutDay', '7');
  }

  const summary = await json('GET', '/crm/incentive/my-summary', token);
  if (summary.res.status !== 200 || !/^\d{4}-\d{2}-07$/.test(summary.data?.nextPayoutDate ?? '')) {
    fail('my-summary payout', JSON.stringify(summary.data?.nextPayoutDate));
  } else {
    ok('my-summary payout', summary.data.nextPayoutDate);
  }

  // One assignment per metric (create for orphan plans)
  const byMetric = new Map();
  for (const metric of ALL_METRICS) {
    const plan = plans.find((p) => p.metricType === metric);
    if (!plan) continue;
    let assignment = assignments.find((a) => a.planId === plan.id && a.isActive);
    if (!assignment) {
      // Prefer any plan of this metric that already has an assignment
      const anyPlanIds = new Set(plans.filter((p) => p.metricType === metric).map((p) => p.id));
      assignment = assignments.find((a) => anyPlanIds.has(a.planId));
    }
    if (!assignment) {
      assignment = await ensureAssignment(token, plan, PROBE_AGENT);
      if (assignment) assignments = [...assignments, assignment];
    }
    if (assignment) {
      const assignedPlan = plans.find((p) => p.id === assignment.planId) ?? plan;
      byMetric.set(metric, { assignment, plan: assignedPlan });
    }
  }

  if (!byMetric.size) {
    fail('assignments', 'none for metrics');
  } else {
    ok('assignments', `metrics covered=${[...byMetric.keys()].join(',')}`);
  }

  // Ops metrics
  const surveyPlan = byMetric.get('survey_count');
  const surveyCount = 15; // between 10 and 20 → last-slab rate from 10@500
  if (surveyPlan) {
    const survey = await json('PATCH', '/crm/incentive/surveys', token, {
      agentName: surveyPlan.assignment.agentName,
      assignmentId: surveyPlan.assignment.id,
      yearMonth: ym,
      surveyCount,
    });
    if (![200, 201].includes(survey.res.status)) {
      fail('survey_count ops', `${survey.res.status} ${survey.text}`);
    } else {
      ok('survey_count ops', `count=${surveyCount}`);
    }
  } else {
    fail('survey_count ops', 'no assignment');
  }

  const channelPlan = byMetric.get('channel_activity');
  if (channelPlan) {
    const channel = await json('PATCH', '/crm/incentive/channels', token, {
      agentName: channelPlan.assignment.agentName,
      assignmentId: channelPlan.assignment.id,
      yearMonth: ym,
      channel: 'whatsapp',
      activityCount: 6,
    });
    if (![200, 201].includes(channel.res.status)) {
      fail('channel_activity ops', `${channel.res.status} ${channel.text}`);
    } else {
      ok('channel_activity ops', 'whatsapp=6');
    }
  } else {
    fail('channel_activity ops', 'no assignment');
  }

  const manualPlan = byMetric.get('manual');
  // Pick an actual that sits between first two slabs when possible (live last-slab check)
  let manualActual = 42;
  let expectedManualPay = null;
  if (manualPlan?.plan?.slabs?.length) {
    const slabs = [...manualPlan.plan.slabs].sort((a, b) => a.monthlyTarget - b.monthlyTarget);
    if (slabs.length >= 2) {
      const low = slabs[0];
      const high = slabs[1];
      manualActual = Math.min(
        high.monthlyTarget - 1,
        Math.max(low.monthlyTarget + 1, Math.round(low.monthlyTarget * 1.15)),
      );
      if (manualActual <= low.monthlyTarget) manualActual = low.monthlyTarget + 1;
      if (manualActual >= high.monthlyTarget) manualActual = high.monthlyTarget - 1;
      expectedManualPay = lastSlabIncentive(slabs, manualActual);
    } else if (slabs.length === 1) {
      manualActual = slabs[0].monthlyTarget;
      expectedManualPay = lastSlabIncentive(slabs, manualActual);
    }
  }
  if (manualPlan) {
    const manual = await json('PATCH', '/crm/incentive/manual-actuals', token, {
      assignmentId: manualPlan.assignment.id,
      yearMonth: ym,
      actualValue: manualActual,
      note: `e2e manual ${STAMP}`,
    });
    if (![200, 201].includes(manual.res.status)) {
      fail('manual actual', `${manual.res.status} ${manual.text}`);
    } else {
      ok('manual actual', String(manualActual));
    }
  } else {
    fail('manual actual', 'no assignment');
  }

  const first = byMetric.values().next().value?.assignment;
  if (first) {
    const attendance = await json('PATCH', '/crm/incentive/attendance', token, {
      agentName: first.agentName,
      userId: first.userId ?? null,
      yearMonth: ym,
      presentDays: 24,
      workingDays: 26,
    });
    if (![200, 201].includes(attendance.res.status)) {
      fail('attendance', `${attendance.res.status} ${attendance.text}`);
    } else {
      ok('attendance', `present=${attendance.data?.presentDays}`);
    }
  }

  const perf = await json('GET', `/crm/incentive/performance?yearMonth=${ym}`, token);
  if (perf.res.status !== 200) {
    fail('performance', `${perf.res.status} ${perf.text}`);
  } else {
    const lines = perf.data.lines ?? [];
    ok('performance', `lines=${lines.length} incentive=${perf.data.totalIncentiveBdt}`);

    for (const metric of ALL_METRICS) {
      const covered = byMetric.get(metric);
      const line = covered
        ? lines.find((l) => l.assignmentId === covered.assignment.id) ??
          lines.find((l) => l.metricType === metric)
        : lines.find((l) => l.metricType === metric);
      if (line) {
        ok(
          `performance line: ${metric}`,
          `actual=${line.actualValue} pay=${line.incentiveBdt} prorata=${Boolean(line.prorataApplied)}`,
        );
      } else if (covered) {
        fail(`performance line: ${metric}`, 'assignment exists but no performance line');
      } else if (presentMetrics.has(metric)) {
        fail(`performance line: ${metric}`, 'plan exists but could not assign');
      } else {
        fail(`performance line: ${metric}`, 'missing plan');
      }
    }

    if (manualPlan) {
      const manualLine = lines.find((l) => l.assignmentId === manualPlan.assignment.id);
      if (!manualLine || manualLine.actualValue !== manualActual) {
        fail('manual reflected', JSON.stringify(manualLine?.actualValue));
      } else {
        ok('manual reflected', `actual=${manualActual}`);
      }
      if (expectedManualPay) {
        if (
          manualLine &&
          manualLine.incentiveBdt === expectedManualPay.incentiveBdt &&
          Boolean(manualLine.prorataApplied) === Boolean(expectedManualPay.prorataApplied)
        ) {
          ok(
            'manual last-slab live',
            `actual=${manualActual} → ৳${manualLine.incentiveBdt} prorata=${manualLine.prorataApplied}`,
          );
        } else {
          fail(
            'manual last-slab live',
            `got ${JSON.stringify({
              actual: manualLine?.actualValue,
              pay: manualLine?.incentiveBdt,
              prorata: manualLine?.prorataApplied,
            })} expected ${JSON.stringify(expectedManualPay)}`,
          );
        }
      }
    }

    if (surveyPlan) {
      const surveyLine = lines.find((l) => l.assignmentId === surveyPlan.assignment.id);
      if (!surveyLine || surveyLine.actualValue !== surveyCount) {
        fail('survey reflected', JSON.stringify(surveyLine?.actualValue));
      } else {
        ok('survey reflected', `actual=${surveyLine.actualValue}`);
      }
      const surveyExpect = lastSlabIncentive(surveyPlan.plan.slabs ?? [], surveyCount);
      if (
        surveyLine &&
        surveyLine.incentiveBdt === surveyExpect.incentiveBdt &&
        Boolean(surveyLine.prorataApplied) === Boolean(surveyExpect.prorataApplied)
      ) {
        ok(
          'survey last-slab live',
          `actual=${surveyCount} → ৳${surveyLine.incentiveBdt} prorata=${surveyLine.prorataApplied}`,
        );
      } else {
        fail(
          'survey last-slab live',
          `got pay=${surveyLine?.incentiveBdt} prorata=${surveyLine?.prorataApplied} expected ${JSON.stringify(surveyExpect)}`,
        );
      }
    }

    if (channelPlan) {
      const channelLine = lines.find((l) => l.assignmentId === channelPlan.assignment.id);
      if (!channelLine || channelLine.actualValue < 6) {
        fail('channel reflected', JSON.stringify(channelLine?.actualValue));
      } else {
        ok('channel reflected', `actual=${channelLine.actualValue}`);
      }
    }

    // Order-like metrics: line must exist (actual may be 0 without seeded orders)
    for (const metric of ['order_count', 'cross_sell_count', 'return_ratio', 'recovery_count']) {
      const covered = byMetric.get(metric);
      if (!covered) continue;
      const line = lines.find((l) => l.assignmentId === covered.assignment.id);
      if (!line) {
        fail(`${metric} calc path`, 'no line');
      } else if (metric === 'return_ratio' && line.actualValue === 0 && line.incentiveBdt !== 0) {
        fail(
          `${metric} calc path`,
          `0 volume must pay ৳0 (got ৳${line.incentiveBdt})`,
        );
      } else {
        ok(
          `${metric} calc path`,
          `actual=${line.actualValue} pay=${line.incentiveBdt} (orders may be 0 in empty month)`,
        );
      }
    }
  }

  const failed = results.filter((r) => !r.pass);
  console.log('\n---');
  console.log(`${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log('Failed:');
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
