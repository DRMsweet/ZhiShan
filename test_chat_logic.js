// 群聊动态消息逻辑测试 —— 与 chat.html / desk.html 逻辑一致
const store = {};
global.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
};

// —— 与 chat.html / desk.html 一致的函数 ——
var NODE_MAP = {
    forum: 'zs_clue_forum', news: 'zs_clue_news', monitor: 'zs_clue_monitor',
    old: 'zs_clue_oldbuilding', script: 'zs_clue_scriptbook', clinic: 'zs_clue_clinic'
};
function evidenceCount() {
    var keys = ['zs_clue_grades','zs_clue_scriptbook','zs_clue_audit',
        'zs_clue_monitor','zs_clue_oldbuilding','zs_clue_clinic','zs_clue_forum'];
    var n = 0;
    keys.forEach(function (k) { try { if (localStorage.getItem(k) === '1') n++; } catch (e) {} });
    return n;
}
function isTriggered(key) {
    if (key === 'ALL') return evidenceCount() >= 7;
    try { return localStorage.getItem(key) === '1'; } catch (e) { return false; }
}
function readState() { try { return JSON.parse(localStorage.getItem('zs_chat_read') || '{}'); } catch (e) { return {}; } }
function saveRead(s) { try { localStorage.setItem('zs_chat_read', JSON.stringify(s)); } catch (e) {} }
function chatUnread() {
    var read = readState();
    var n = 0;
    for (var id in NODE_MAP) {
        if (isTriggered(NODE_MAP[id]) && !read[id]) n++;
    }
    if (evidenceCount() >= 7 && !read['dorm']) n++;
    return n;
}

let pass = 0, fail = 0;
function check(name, cond) {
    if (cond) { console.log('  ✅', name); pass++; }
    else { console.log('  ❌', name); fail++; }
}

// 用例1：无证据
console.log('用例1：未开始调查（0 证据）');
check('无节点触发，红点 = 0', chatUnread() === 0);

// 用例2：登录校园墙
console.log('用例2：登录校园墙 (forum)');
store['zs_clue_forum'] = '1';
check('forum 节点触发，红点 = 1', chatUnread() === 1);

// 用例3：标记 forum 已读
console.log('用例3：群聊里读过后');
saveRead({ forum: 1 });
check('forum 已读，红点 = 0', chatUnread() === 0);
store['zs_clue_news'] = '1';
store['zs_clue_monitor'] = '1';
check('又触发 2 个节点，红点 = 2', chatUnread() === 2);
saveRead({ forum: 1, news: 1 });
check('news 已读，红点 = 1 (monitor 未读)', chatUnread() === 1);

// 用例4：集齐 7 项证据 → dorm 节点
console.log('用例4：证据集齐 7/7');
['zs_clue_grades','zs_clue_scriptbook','zs_clue_audit','zs_clue_monitor','zs_clue_oldbuilding','zs_clue_clinic','zs_clue_forum'].forEach(k => store[k]='1');
check('evidenceCount = 7', evidenceCount() === 7);
check('dorm 节点触发（含 monitor+old+script+clinic+dorm 未读）', chatUnread() >= 1);
// 全部标记已读
saveRead({ forum:1, news:1, monitor:1, old:1, script:1, clinic:1, dorm:1 });
check('全部已读后红点 = 0', chatUnread() === 0);

// 用例5：清除证据后 dorm 不再触发
console.log('用例5：状态清理');
delete store['zs_clue_forum'];
store['zs_chat_read'] = JSON.stringify({});
check('仅剩 6 项时 dorm 不触发（6 < 7）', evidenceCount() === 6 && chatUnread() === 5);
check('剩余 5 个已触发节点（news/monitor/old/script/clinic）未读，红点 = 5', chatUnread() === 5);

console.log(`\n${fail === 0 ? '🎉 全部通过' : '❌ ' + fail + ' 项失败'}（${pass} 通过 / ${fail} 失败）`);
process.exit(fail === 0 ? 0 : 1);
