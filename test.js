const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element {
  constructor() {
    this.children = [];
    this.nodes = new Map();
    this.value = '';
    this.checked = false;
    this.hidden = true;
    this.textContent = '';
    this.classList = { toggle() {} };
  }
  set innerHTML(value) { this.html = value; this.children = []; }
  get innerHTML() { return this.html; }
  appendChild(child) { this.children.push(child); }
  append(...children) { children.forEach(child => this.appendChild(child)); }
  addEventListener() {}
  setAttribute(name, value) { this[name] = value; }
  click() { this.clicked = true; }
  focus() {}
  querySelector(selector) {
    if (!this.nodes.has(selector)) this.nodes.set(selector, new Element());
    return this.nodes.get(selector);
  }
  querySelectorAll() { return this.children; }
}

function openApp({ now = new Date(2025, 0, 15, 9).getTime(), saved, confirm = false } = {}) {
  class FakeDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const ids = ['appVersion', 'list', 'totalTime', 'nameInput', 'addBtn', 'manageBtn', 'archivedBtn', 'prepModal', 'yesterdayList', 'closePrepBtn', 'confirmPrepBtn', 'archivedModal', 'archivedList', 'closeArchivedBtn', 'categoryOptions', 'homeView', 'reportView', 'reportsBtn', 'homeBtn', 'dailyReportBtn', 'weeklyReportBtn', 'previousPeriodBtn', 'nextPeriodBtn', 'reportPeriod', 'reportTotal', 'reportContent', 'exportReportBtn', 'exportBackupBtn', 'importBackupBtn', 'importBackupInput', 'dataMessage', 'retentionModal', 'dismissRetentionBtn', 'deleteOldDataBtn'];
  const elements = new Map(ids.map(id => [id, new Element()]));
  const storage = new Map(saved ? [['timeTracker_activities_v1', JSON.stringify(saved)]] : []);
  const downloads = [];
  const windowEvents = new Map();
  const context = {
    Date: FakeDate,
    Math,
    JSON,
    console,
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    Blob: class { constructor(parts, options) { this.text = parts.join(''); this.options = options; } },
    URL: { createObjectURL: blob => { downloads.push(blob); return `blob:${downloads.length}`; }, revokeObjectURL() {} },
    document: { getElementById: id => elements.get(id), createElement: () => new Element() },
    window: { addEventListener: (name, listener) => windowEvents.set(name, listener), confirm: () => confirm },
    setInterval() {}
  };
  const html = fs.readFileSync('index.html', 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(`${script}\nglobalThis.api = { addActivity, toggle, tick, load, prepareToday, yesterdayActivities, todayActivities, openPreparation, openArchivedActivities, archiveActivity, restoreActivity, deleteArchivedActivity, setActivityCategory, categoryTotals, reportData, weekDates, mondayFor, shiftLocalDate, renderReport, csvForDates, reportDates, exportReport, backupSnapshot, exportBackup, validBackup, importBackupText, hasExpiredData, maybeShowRetentionNotice, dismissRetentionNotice, deleteExpiredData, setReportPeriod: (mode, date) => { reportMode = mode; reportDate = date; }, getState: () => state };`, context);
  return {
    ...context.api,
    elements,
    downloads,
    saved: () => JSON.parse(storage.get('timeTracker_activities_v1')),
    advance: ms => { now += ms; },
    setConfirm: value => { confirm = value; },
    pagehide: () => windowEvents.get('pagehide')()
  };
}

const source = fs.readFileSync('index.html', 'utf8');
assert.ok(source.includes('<title>OneTimer — Timer attività</title>'));
assert.ok(!source.includes('fonts.googleapis.com'));

const tracker = openApp();
assert.equal(tracker.elements.get('appVersion').textContent, 'v0.1.0+local');
tracker.addActivity('A');
tracker.advance(1_000);
tracker.addActivity('B');
assert.equal(tracker.getState().dailyActivities.find(d => d.activityId === tracker.getState().activities.find(a => a.name === 'A').id).elapsedMs, 1_000);
assert.equal(tracker.getState().activeActivityId, tracker.getState().activities.find(a => a.name === 'B').id);
tracker.advance(2_000);
tracker.toggle(tracker.getState().activities.find(a => a.name === 'A').id);
assert.equal(tracker.getState().dailyActivities.find(d => d.activityId === tracker.getState().activities.find(a => a.name === 'B').id).elapsedMs, 2_000);
tracker.advance(1_000);
tracker.toggle(tracker.getState().activities.find(a => a.name === 'A').id);
assert.equal(tracker.getState().dailyActivities.find(d => d.activityId === tracker.getState().activities.find(a => a.name === 'A').id).elapsedMs, 2_000);

const closeBoundary = openApp();
closeBoundary.addActivity('A');
closeBoundary.advance(60_000);
closeBoundary.pagehide();
assert.equal(closeBoundary.getState().activeActivityId, null);
assert.equal(closeBoundary.getState().dailyActivities[0].elapsedMs, 60_000);
const reopenedAfterClose = openApp({ now: new Date(2025, 0, 15, 9, 6).getTime(), saved: closeBoundary.saved() });
assert.equal(reopenedAfterClose.getState().activeActivityId, null);
assert.equal(reopenedAfterClose.getState().dailyActivities[0].elapsedMs, 60_000);

const backgroundTimer = openApp();
backgroundTimer.addActivity('A');
backgroundTimer.advance(60_000);
backgroundTimer.tick();
assert.equal(backgroundTimer.getState().activeActivityId, backgroundTimer.getState().activities[0].id);
assert.equal(backgroundTimer.elements.get('totalTime').textContent, '00:01:00');

const midnightTimer = openApp({ now: new Date(2025, 0, 15, 23, 50).getTime() });
midnightTimer.addActivity('A');
midnightTimer.advance(30 * 60_000);
midnightTimer.tick();
assert.equal(midnightTimer.getState().activeActivityId, midnightTimer.getState().activities[0].id);
assert.equal(JSON.stringify(midnightTimer.getState().dailyActivities.map(record => [record.localDate, record.elapsedMs])), JSON.stringify([
  ['2025-01-15', 10 * 60_000], ['2025-01-16', 20 * 60_000]
]));
assert.equal(midnightTimer.getState().activities.length, 1);

const beforeReloadAtMidnight = openApp({ now: new Date(2025, 0, 15, 23, 50).getTime() });
beforeReloadAtMidnight.addActivity('A');
beforeReloadAtMidnight.advance(5 * 60_000);
beforeReloadAtMidnight.pagehide();
const resumedAtMidnight = openApp({ now: new Date(2025, 0, 15, 23, 55).getTime(), saved: beforeReloadAtMidnight.saved() });
resumedAtMidnight.toggle(resumedAtMidnight.getState().activities[0].id);
resumedAtMidnight.advance(25 * 60_000);
resumedAtMidnight.tick();
assert.equal(JSON.stringify(resumedAtMidnight.getState().dailyActivities.map(record => [record.localDate, record.elapsedMs])), JSON.stringify([
  ['2025-01-15', 10 * 60_000], ['2025-01-16', 20 * 60_000]
]));
assert.equal(resumedAtMidnight.getState().activities.length, 1);
assert.equal(new Set(resumedAtMidnight.getState().dailyActivities.map(record => `${record.localDate}:${record.activityId}`)).size, 2);

const yesterday = '2025-01-15';
const today = '2025-01-16';
const activities = ['A', 'B', 'C'].map((name, index) => ({ id: `a${index}`, name, archived: false }));
const prepared = openApp({
  now: new Date(2025, 0, 16, 9).getTime(),
  saved: {
    activities,
    dailyActivities: activities.map(activity => ({ localDate: yesterday, activityId: activity.id, elapsedMs: 1_000 })),
    activeActivityId: null,
    startedAt: null
  }
});

assert.equal(prepared.elements.get('prepModal').hidden, false);
assert.deepEqual(prepared.yesterdayActivities().map(activity => activity.name), ['A', 'B', 'C']);
assert.deepEqual(prepared.elements.get('yesterdayList').children.map(label => label.children[0].checked), [false, false, false]);
assert.deepEqual(prepared.getState().dailyActivities.filter(d => d.localDate === today), []);

prepared.prepareToday(['a0', 'a2']);
assert.deepEqual(prepared.getState().dailyActivities.filter(d => d.localDate === today).map(d => [d.activityId, d.elapsedMs]), [['a0', 0], ['a2', 0]]);
assert.equal(prepared.getState().activeActivityId, null);
assert.equal(prepared.elements.get('list').children.length, 2);

prepared.toggle('a0');
prepared.advance(1_000);
prepared.toggle('a0');
prepared.prepareToday(['a0', 'a1']);
assert.deepEqual(prepared.getState().dailyActivities.filter(d => d.localDate === today).map(d => [d.activityId, d.elapsedMs]), [['a0', 1_000], ['a2', 0], ['a1', 0]]);
assert.equal(prepared.getState().activeActivityId, null);

const reloaded = openApp({ now: new Date(2025, 0, 16, 10).getTime(), saved: prepared.saved() });
assert.equal(reloaded.elements.get('prepModal').hidden, true);
reloaded.openPreparation();
assert.deepEqual(reloaded.yesterdayActivities().map(activity => activity.name), ['A', 'B', 'C']);
assert.deepEqual(reloaded.elements.get('yesterdayList').children.map(label => label.children[0].checked), [false, false, false]);
assert.equal(reloaded.getState().dailyActivities.find(d => d.localDate === today && d.activityId === 'a0').elapsedMs, 1_000);

const lifecycle = openApp({
  saved: {
    activities: [
      { id: 'paused', name: 'Paused', archived: false },
      { id: 'active', name: 'Active', archived: false },
      { id: 'today-archived', name: 'Today archived', archived: true, archivedDate: '2025-01-15' },
      { id: 'older-archived', name: 'Older archived', archived: true, archivedDate: '2025-01-10' }
    ],
    dailyActivities: [
      { localDate: '2025-01-15', activityId: 'paused', elapsedMs: 5_000 },
      { localDate: '2025-01-15', activityId: 'active', elapsedMs: 1_000 },
      { localDate: '2025-01-10', activityId: 'older-archived', elapsedMs: 7_000 }
    ],
    activeActivityId: 'active',
    startedAt: new Date(2025, 0, 15, 9).getTime()
  }
});
const oldHistory = JSON.stringify(lifecycle.getState().dailyActivities.filter(record => record.localDate === '2025-01-10'));
lifecycle.archiveActivity('paused');
assert.deepEqual(lifecycle.todayActivities().map(activity => activity.id), ['active']);
assert.equal(lifecycle.getState().activities.find(activity => activity.id === 'paused').archivedDate, '2025-01-15');
assert.equal(lifecycle.getState().dailyActivities.find(record => record.activityId === 'paused').elapsedMs, 5_000);
lifecycle.advance(2_000);
lifecycle.archiveActivity('active');
assert.equal(lifecycle.getState().activeActivityId, null);
assert.equal(lifecycle.getState().dailyActivities.find(record => record.activityId === 'active').elapsedMs, 3_000);
assert.equal(lifecycle.elements.get('totalTime').textContent, '00:00:08');
lifecycle.openArchivedActivities();
assert.equal(lifecycle.elements.get('archivedModal').hidden, false);
assert.deepEqual(lifecycle.elements.get('archivedList').children.map(row => row.children[1].textContent), [
  'Archiviata il 2025-01-15', 'Archiviata il 2025-01-15', 'Archiviata il 2025-01-15', 'Archiviata il 2025-01-10'
]);

const tomorrow = openApp({ now: new Date(2025, 0, 16, 9).getTime(), saved: lifecycle.saved() });
assert.deepEqual(tomorrow.yesterdayActivities(), []);
lifecycle.restoreActivity('today-archived');
assert.equal(lifecycle.getState().activeActivityId, null);
const restoredToday = lifecycle.getState().dailyActivities.find(record => record.activityId === 'today-archived');
assert.equal(restoredToday.localDate, '2025-01-15');
assert.equal(restoredToday.elapsedMs, 0);
lifecycle.restoreActivity('older-archived');
assert.equal(lifecycle.getState().dailyActivities.find(record => record.localDate === '2025-01-10' && record.activityId === 'older-archived').elapsedMs, 7_000);
assert.equal(JSON.stringify(lifecycle.getState().dailyActivities.filter(record => record.localDate === '2025-01-10')), oldHistory);
lifecycle.archiveActivity('older-archived');
assert.equal(lifecycle.deleteArchivedActivity('older-archived'), false);
assert.ok(lifecycle.getState().activities.some(activity => activity.id === 'older-archived'));
lifecycle.setConfirm(true);
assert.equal(lifecycle.deleteArchivedActivity('older-archived'), true);
assert.ok(!lifecycle.getState().activities.some(activity => activity.id === 'older-archived'));
assert.ok(!lifecycle.getState().dailyActivities.some(record => record.activityId === 'older-archived'));

const legacy = openApp({ saved: [{ id: 'legacy', name: 'Legacy', elapsed: 3_000, running: true, startedAt: new Date(2025, 0, 15, 8).getTime() }] });
assert.equal(legacy.load().activeActivityId, 'legacy');
assert.equal(legacy.load().dailyActivities[0].elapsedMs, 3_000);

const categories = openApp({
  now: new Date(2025, 0, 16, 9).getTime(),
  saved: {
    activities: [
      { id: 'alice', name: 'Email — Alice', archived: false },
      { id: 'bob', name: 'Email — Bob', category: 'email', archived: false },
      { id: 'team', name: 'Email — Team', category: 'EMAIL', archived: false },
      { id: 'misc', name: 'Misc', category: 'SALES', archived: false }
    ],
    dailyActivities: [
      { localDate: '2025-01-15', activityId: 'alice', elapsedMs: 100 },
      { localDate: '2025-01-15', activityId: 'bob', elapsedMs: 200 },
      { localDate: '2025-01-15', activityId: 'team', elapsedMs: 400 },
      { localDate: '2025-01-15', activityId: 'misc', elapsedMs: 300 },
      { localDate: '2025-01-16', activityId: 'alice', elapsedMs: 0 }
    ],
    activeActivityId: 'alice',
    startedAt: new Date(2025, 0, 16, 8, 59, 59).getTime()
  }
});
const timerBeforeCategoryEdit = JSON.stringify({ activeActivityId: categories.getState().activeActivityId, startedAt: categories.getState().startedAt, dailyActivities: categories.getState().dailyActivities });
categories.setActivityCategory('alice', ' email ');
assert.equal(categories.getState().activities.find(activity => activity.id === 'alice').category, 'EMAIL');
assert.deepEqual(categories.elements.get('categoryOptions').children.map(option => option.value), ['EMAIL', 'SALES']);
categories.setActivityCategory('alice', 'comms');
assert.equal(categories.getState().activities.find(activity => activity.id === 'alice').category, 'COMMS');
assert.deepEqual(categories.getState().activities.filter(activity => ['bob', 'team'].includes(activity.id)).map(activity => activity.category), ['EMAIL', 'EMAIL']);
assert.equal(JSON.stringify(categories.categoryTotals('2025-01-15')), JSON.stringify([{ category: 'COMMS', elapsedMs: 100 }, { category: 'EMAIL', elapsedMs: 600 }, { category: 'SALES', elapsedMs: 300 }]));
categories.setActivityCategory('bob', 'support', true);
assert.deepEqual(categories.getState().activities.filter(activity => ['bob', 'team'].includes(activity.id)).map(activity => activity.category), ['SUPPORT', 'SUPPORT']);
categories.setActivityCategory('misc', '');
assert.ok(categories.categoryTotals('2025-01-15').some(total => total.category === 'SENZA CATEGORIA' && total.elapsedMs === 300));
assert.equal(JSON.stringify({ activeActivityId: categories.getState().activeActivityId, startedAt: categories.getState().startedAt, dailyActivities: categories.getState().dailyActivities }), timerBeforeCategoryEdit);

const reports = openApp({
  now: new Date(2025, 0, 15, 9).getTime(),
  saved: {
    activities: [
      { id: 'email-1', name: 'Email', category: 'COMMS', archived: false },
      { id: 'email-2', name: 'Email', category: 'COMMS', archived: true },
      { id: 'email-sales', name: 'Email', category: 'SALES', archived: false },
      { id: 'planning', name: 'Planning', archived: false }
    ],
    dailyActivities: [
      { localDate: '2025-01-13', activityId: 'email-1', elapsedMs: 60_000 },
      { localDate: '2025-01-15', activityId: 'email-1', elapsedMs: 120_000 },
      { localDate: '2025-01-15', activityId: 'email-2', elapsedMs: 180_000 },
      { localDate: '2025-01-15', activityId: 'email-sales', elapsedMs: 240_000 },
      { localDate: '2025-01-15', activityId: 'planning', elapsedMs: 300_000 }
    ],
    activeActivityId: null,
    startedAt: null
  }
});
const reportStateBefore = JSON.stringify(reports.getState());
const wednesdayReport = reports.reportData(['2025-01-15']);
assert.equal(wednesdayReport.total, 840_000);
assert.deepEqual(JSON.parse(JSON.stringify(wednesdayReport.activities)), [
  { name: 'Email', category: 'COMMS', elapsedMs: 300_000 },
  { name: 'Email', category: 'SALES', elapsedMs: 240_000 },
  { name: 'Planning', category: 'SENZA CATEGORIA', elapsedMs: 300_000 }
]);
assert.deepEqual(JSON.parse(JSON.stringify(wednesdayReport.categories)), [
  { category: 'COMMS', elapsedMs: 300_000 },
  { category: 'SALES', elapsedMs: 240_000 },
  { category: 'SENZA CATEGORIA', elapsedMs: 300_000 }
]);
const week = reports.weekDates('2025-01-15');
assert.deepEqual(JSON.parse(JSON.stringify(week)), ['2025-01-13', '2025-01-14', '2025-01-15', '2025-01-16', '2025-01-17', '2025-01-18', '2025-01-19']);
assert.equal(reports.reportData(['2025-01-13']).total, 60_000);
assert.equal(JSON.stringify(reports.weekDates('2025-01-19')), JSON.stringify(week));
assert.deepEqual(JSON.parse(JSON.stringify(reports.weekDates('2025-01-20'))), ['2025-01-20', '2025-01-21', '2025-01-22', '2025-01-23', '2025-01-24', '2025-01-25', '2025-01-26']);
const weeklyReport = reports.reportData(week);
assert.equal(weeklyReport.total, 900_000);
assert.deepEqual(JSON.parse(JSON.stringify(weeklyReport.days.map(day => day.elapsedMs))), [60_000, 0, 840_000, 0, 0, 0, 0]);
assert.equal(weeklyReport.total, weeklyReport.days.reduce((sum, day) => sum + day.elapsedMs, 0));
assert.deepEqual(JSON.parse(JSON.stringify(reports.reportData(['2025-01-14']).activities)), []);
assert.equal(JSON.stringify(reports.getState()), reportStateBefore);
reports.setActivityCategory('email-1', 'support');
assert.ok(reports.reportData(week).categories.some(row => row.category === 'SUPPORT' && row.elapsedMs === 180_000));

const csv = openApp({
  saved: {
    activities: [
      { id: 'quoted', name: 'Email, "Mario"\nFollow-up', category: 'COM,MS', archived: false },
      { id: 'coding', name: 'Coding', archived: false },
      { id: 'later', name: 'Later', category: 'LATER', archived: false }
    ],
    dailyActivities: [
      { localDate: '2025-01-15', activityId: 'quoted', elapsedMs: 5_400_000 },
      { localDate: '2025-01-15', activityId: 'coding', elapsedMs: 11_700_000 },
      { localDate: '2025-01-13', activityId: 'later', elapsedMs: 60_000 }
    ],
    activeActivityId: null,
    startedAt: null
  }
});
const csvStateBefore = JSON.stringify(csv.getState());
assert.equal(csv.csvForDates(['2025-01-15']), 'date,activity,category,duration\r\n2025-01-15,Coding,,03:15:00\r\n2025-01-15,"Email, ""Mario""\nFollow-up","COM,MS",01:30:00\r\n');
assert.equal(csv.csvForDates(['2025-01-14']), 'date,activity,category,duration\r\n');
csv.setReportPeriod('daily', '2025-01-15');
assert.deepEqual(JSON.parse(JSON.stringify(csv.reportDates())), ['2025-01-15']);
csv.exportReport();
assert.equal(csv.downloads[0].text, csv.csvForDates(['2025-01-15']));
csv.setReportPeriod('weekly', '2025-01-15');
assert.deepEqual(JSON.parse(JSON.stringify(csv.reportDates())), ['2025-01-13', '2025-01-14', '2025-01-15', '2025-01-16', '2025-01-17', '2025-01-18', '2025-01-19']);
assert.equal(csv.csvForDates(csv.reportDates()), 'date,activity,category,duration\r\n2025-01-13,Later,LATER,00:01:00\r\n2025-01-15,Coding,,03:15:00\r\n2025-01-15,"Email, ""Mario""\nFollow-up","COM,MS",01:30:00\r\n');
assert.equal(JSON.stringify(csv.getState()), csvStateBefore);

assert.equal(legacy.saved().schemaVersion, 1);

const backupTimer = openApp();
backupTimer.addActivity('Running');
backupTimer.advance(1_500);
const runningBackup = backupTimer.backupSnapshot();
assert.deepEqual(JSON.parse(JSON.stringify(runningBackup.dailyActivities)), [{ localDate: '2025-01-15', activityId: backupTimer.getState().activeActivityId, elapsedMs: 1_500 }]);
assert.equal(backupTimer.getState().activeActivityId, runningBackup.activities[0].id);
assert.equal(backupTimer.getState().dailyActivities[0].elapsedMs, 0);
assert.deepEqual(Object.keys(runningBackup).sort(), ['activities', 'dailyActivities', 'exportedAt', 'schemaVersion']);

const validBackup = {
  schemaVersion: 1,
  exportedAt: '2025-01-15T09:00:00.000Z',
  activities: [{ id: 'imported', name: 'Imported', archived: false }],
  dailyActivities: [{ localDate: '2025-01-14', activityId: 'imported', elapsedMs: 4_000 }]
};
const importing = openApp({ confirm: true });
importing.addActivity('Current');
importing.advance(1_000);
assert.equal(importing.importBackupText(JSON.stringify(validBackup)), true);
assert.deepEqual(JSON.parse(JSON.stringify(importing.getState().activities)), validBackup.activities);
assert.deepEqual(JSON.parse(JSON.stringify(importing.getState().dailyActivities)), validBackup.dailyActivities);
assert.equal(importing.getState().activeActivityId, null);
assert.equal(importing.getState().startedAt, null);
assert.equal(importing.elements.get('reportView').hidden, false);
assert.equal(importing.elements.get('reportTotal').textContent, '00:00:04');

const cancelledImport = openApp();
cancelledImport.addActivity('Current');
const beforeCancelledImport = JSON.stringify(cancelledImport.getState());
assert.equal(cancelledImport.importBackupText(JSON.stringify(validBackup)), false);
assert.equal(JSON.stringify(cancelledImport.getState()), beforeCancelledImport);

const invalidImport = openApp();
invalidImport.addActivity('Current');
const beforeInvalidImport = JSON.stringify(invalidImport.getState());
assert.equal(invalidImport.importBackupText('{bad json'), false);
assert.equal(JSON.stringify(invalidImport.getState()), beforeInvalidImport);
assert.equal(invalidImport.importBackupText(JSON.stringify({ ...validBackup, schemaVersion: 2 })), false);
assert.equal(JSON.stringify(invalidImport.getState()), beforeInvalidImport);
assert.equal(invalidImport.elements.get('dataMessage').className, 'message error');

const retentionNow = new Date(2025, 0, 31, 9).getTime();
const retentionData = {
  schemaVersion: 1,
  activities: [{ id: 'kept', name: 'Kept', archived: false }],
  dailyActivities: [
    { localDate: '2024-12-31', activityId: 'kept', elapsedMs: 1_000 },
    { localDate: '2025-01-01', activityId: 'kept', elapsedMs: 2_000 },
    { localDate: '2025-01-31', activityId: 'kept', elapsedMs: 3_000 }
  ],
  activeActivityId: null,
  startedAt: null
};
const retention = openApp({ now: retentionNow, saved: retentionData, confirm: true });
assert.equal(retention.elements.get('retentionModal').hidden, false);
const seenRetention = openApp({ now: retentionNow, saved: retention.saved() });
assert.equal(seenRetention.elements.get('retentionModal').hidden, true);
assert.equal(retention.dismissRetentionNotice(), true);
const dismissedRetention = retention.saved();
assert.equal(dismissedRetention.retentionNoticeDay, '2025-01-31');
const retentionReload = openApp({ now: retentionNow, saved: dismissedRetention });
assert.equal(retentionReload.elements.get('retentionModal').hidden, true);
const deleting = openApp({ now: retentionNow, saved: retentionData, confirm: true });
assert.equal(deleting.deleteExpiredData(), true);
assert.deepEqual(deleting.getState().dailyActivities.map(record => record.localDate), ['2025-01-01', '2025-01-31']);
assert.deepEqual(JSON.parse(JSON.stringify(deleting.getState().activities)), retentionData.activities);

console.log('issue #1, #2, #3, #4, #5, #6, #7 and #8 checks passed');
