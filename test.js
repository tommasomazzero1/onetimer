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
  const ids = ['list', 'totalTime', 'nameInput', 'addBtn', 'manageBtn', 'prepModal', 'yesterdayList', 'closePrepBtn', 'confirmPrepBtn'];
  const elements = new Map(ids.map(id => [id, new Element()]));
  const storage = new Map(saved ? [['timeTracker_activities_v1', JSON.stringify(saved)]] : []);
  const context = {
    Date: FakeDate,
    Math,
    JSON,
    console,
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    document: { getElementById: id => elements.get(id), createElement: () => new Element() },
    window: { addEventListener() {} },
    setInterval() {}
  };
  const html = fs.readFileSync('index.html', 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(`${script}\nglobalThis.api = { addActivity, toggle, load, prepareToday, yesterdayActivities, openPreparation, getState: () => state };`, context);
  return {
    ...context.api,
    elements,
    saved: () => JSON.parse(storage.get('timeTracker_activities_v1')),
    advance: ms => { now += ms; }
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

const legacy = openApp({ saved: [{ id: 'legacy', name: 'Legacy', elapsed: 3_000, running: true, startedAt: new Date(2025, 0, 15, 8).getTime() }] });
assert.equal(legacy.load().activeActivityId, 'legacy');
assert.equal(legacy.load().dailyActivities[0].elapsedMs, 3_000);

console.log('issue #1 and #2 checks passed');
