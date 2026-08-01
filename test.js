const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

let now = new Date(2025, 0, 15, 9).getTime();
class FakeDate extends Date {
  constructor(...args) { super(...(args.length ? args : [now])); }
  static now() { return now; }
}

class Element {
  constructor() { this.children = []; this.nodes = new Map(); this.value = ''; this.textContent = ''; }
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

const elements = new Map(['list', 'totalTime', 'nameInput', 'addBtn'].map(id => [id, new Element()]));
const storage = new Map();
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
vm.runInNewContext(`${script}\nglobalThis.api = { addActivity, toggle, load, getState: () => state };`, context);
const { addActivity, toggle, getState } = context.api;

addActivity('A');
assert.equal(getState().activities.length, 1);
assert.equal(getState().activeActivityId, getState().activities[0].id);
assert.equal(getState().dailyActivities[0].elapsedMs, 0);

now += 1_000;
addActivity('B');
assert.equal(getState().dailyActivities.find(d => d.activityId === getState().activities.find(a => a.name === 'A').id).elapsedMs, 1_000);
assert.equal(getState().activeActivityId, getState().activities.find(a => a.name === 'B').id);

now += 2_000;
toggle(getState().activities.find(a => a.name === 'A').id);
assert.equal(getState().dailyActivities.find(d => d.activityId === getState().activities.find(a => a.name === 'B').id).elapsedMs, 2_000);
assert.equal(getState().activeActivityId, getState().activities.find(a => a.name === 'A').id);

now += 1_000;
toggle(getState().activities.find(a => a.name === 'A').id);
assert.equal(getState().activeActivityId, null);
assert.equal(getState().dailyActivities.find(d => d.activityId === getState().activities.find(a => a.name === 'A').id).elapsedMs, 2_000);

addActivity('  a  ');
assert.equal(getState().activities.length, 2);
assert.equal(getState().activeActivityId, getState().activities.find(a => a.name === 'A').id);
assert.equal(JSON.stringify(JSON.parse(storage.get('timeTracker_activities_v1')).dailyActivities), JSON.stringify(getState().dailyActivities));

toggle(getState().activities.find(a => a.name === 'A').id);
now += 86_400_000;
addActivity('A');
const aId = getState().activities.find(a => a.name === 'A').id;
const aDays = getState().dailyActivities.filter(d => d.activityId === aId);
assert.equal(aDays.length, 2);
assert.equal(aDays.at(-1).elapsedMs, 0);

storage.set('timeTracker_activities_v1', JSON.stringify([{ id: 'legacy', name: 'Legacy', elapsed: 3_000, running: true, startedAt: now - 500 }]));
const migrated = context.api.load();
assert.equal(migrated.activeActivityId, 'legacy');
assert.equal(migrated.startedAt, now - 500);
assert.equal(migrated.dailyActivities[0].elapsedMs, 3_000);

console.log('issue #1 checks passed');
