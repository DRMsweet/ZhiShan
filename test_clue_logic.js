// 模拟浏览器 localStorage + 验证宿舍解锁逻辑
const store = {};
global.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }
};

// 与 desk.html / dorm.html / clues.html / final.html 完全一致的 evidenceCount
function evidenceCount() {
    var keys = [
        'zs_clue_grades', 'zs_clue_scriptbook', 'zs_clue_audit',
        'zs_clue_monitor', 'zs_clue_oldbuilding', 'zs_clue_clinic', 'zs_clue_forum'
    ];
    var n = 0;
    keys.forEach(function(k) { try { if (localStorage.getItem(k) === '1') n++; } catch(e) {} });
    return n;
}

let pass = 0, fail = 0;
function check(name, cond) {
    if (cond) { console.log('  ✅', name); pass++; }
    else { console.log('  ❌', name); fail++; }
}

// 用例1：一个证据都没收集 → 宿舍锁
console.log('用例1：证据 0/7');
check('evidenceCount = 0', evidenceCount() === 0);
check('宿舍未解锁 (0 < 7)', evidenceCount() < 7);

// 用例2：收集部分证据 → 宿舍仍锁
console.log('用例2：证据 3/7');
store['zs_clue_grades'] = '1';
store['zs_clue_scriptbook'] = '1';
store['zs_clue_audit'] = '1';
check('evidenceCount = 3', evidenceCount() === 3);
check('宿舍未解锁 (3 < 7)', evidenceCount() < 7);

// 用例3：集齐 7 项 → 宿舍解锁
console.log('用例3：证据 7/7');
['zs_clue_monitor','zs_clue_oldbuilding','zs_clue_clinic','zs_clue_forum'].forEach(k => store[k]='1');
check('evidenceCount = 7', evidenceCount() === 7);
check('宿舍已解锁 (7 >= 7)', evidenceCount() >= 7);

// 用例4：final 好结局阈值 = 7
console.log('用例4：final 提交阈值');
store['zs_clue_grades'] = null; delete store['zs_clue_grades'];
check('缺 1 项时不可提交 (6 < 7)', evidenceCount() < 7);
store['zs_clue_grades'] = '1';
check('集齐后可以提交 (7 >= 7)', evidenceCount() >= 7);

console.log(`\n${fail === 0 ? '🎉 全部通过' : '❌ ' + fail + ' 项失败'}（${pass} 通过 / ${fail} 失败）`);
process.exit(fail === 0 ? 0 : 1);
