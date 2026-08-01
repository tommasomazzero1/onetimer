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
  }
  set innerHTML(value) { this.html = value; this.children = []; }
  get innerHTML() { return this.html; }
  appendChild(child) { this.children.push(child); }
  addEventListener() {}
  focus() {}
  querySelector(selector) {
    if (!this.nodes.has(selector)) this.nodes.set(selector, new Element());
    return this.nodes.get(selector);
  }
  querySelectorAll() { return this.children; }
}

function openApp({ now = new Date(2025, 0, 15, 9).getTime(), saved } = {}) {
  class FakeDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const ids = ['list', 'totalTime', 'nameInput', 'addBtn', 'manageBtn', 'archivedBtn', 'prepModal', 'yesterdayList', 'closePrepBtn', 'confirmPrepBtn', 'archivedModal', 'archivedList', 'closeArchivedBtn', 'categoryOptions', 'categoryReport'];
  const elements = new Map(ids.map(id => [id, new Element()]));
  const storage = new Map(saved ? [['timeTracker_activities_v1', JSON.stringify(saved)]] : []);
  const windowEvents = new Map();
  const context = {
    Date: FakeDate,
    Math,
    JSON,
    console,
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    document: { getElementById: id => elements.get(id), createElement: () => new Element() },
    window: { addEventListener: (name, listener) => windowEvents.set(name, listener), confirm: () => false },
    setInterval() {}
  };
  const html = fs.readFileSync('index.html', 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(`${script}\nglobalThis.api = { addActivity, toggle, tick, load, prepareToday, yesterdayActivities, todayActivities, openPreparation, openArchivedActivities, archiveActivity, restoreActivity, setActivityCategory, categoryTotals, getState: () => state };`, context);
  return {
    ...context.api,
    elements,
    saved: () => JSON.parse(storage.get('timeTracker_activities_v1')),
    advance: ms => { now += ms; },
    pagehide: () => windowEvents.get('pagehide')()
  };
}

const tracker = openApp();
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

console.log('issue #1, #2, #3, #4 and #5 checks passed');
