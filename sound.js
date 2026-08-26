/* ═══════════════════════════════════════════
   sound.js —— 蓬莱一中 · 恐怖音效引擎
   纯 Web Audio 合成：心跳 / 脚步声 / 风声 / 惊吓音
   无需任何音频文件；AudioContext 不可用时静默降级（no-op）
   ═══════════════════════════════════════════ */
(function () {
    'use strict';

    var ctx = null;
    var enabled = true;      // 全局音效开关
    var tension = 4;         // 紧张度 0-10：越高心跳越快越重
    var hbTimer = null;
    var noiseBuf = null;
    var windGain = null;
    var flashStyleAdded = false;

    // 音效开关（localStorage 持久化）
    try { enabled = localStorage.getItem('zs_sound_off') !== '1'; } catch (e) {}

    function initCtx() {
        if (ctx) return ctx;
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
        } catch (e) { return null; }
        return ctx;
    }
    function resume() {
        var c = initCtx();
        if (c && c.state === 'suspended') { c.resume().catch(function () {}); }
    }
    function getEnabled() { return enabled; }
    function setEnabled(v) {
        enabled = !!v;
        try { localStorage.setItem('zs_sound_off', enabled ? '0' : '1'); } catch (e) {}
        if (!enabled) { stopHeart(); stopWind(); }
        else if (initCtx()) { startHeart(); }
    }

    // —— 噪声缓冲（缓存一次） ——
    function getNoiseBuf() {
        var c = initCtx(); if (!c) return null;
        if (noiseBuf) return noiseBuf;
        var len = c.sampleRate * 2;
        noiseBuf = c.createBuffer(1, len, c.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        return noiseBuf;
    }

    // —— 心跳：一对低频 thump ——
    function thump(when, vol) {
        var c = initCtx(); if (!c || !enabled) return;
        var osc = c.createOscillator();
        var g = c.createGain();
        osc.type = 'sine';
        osc.frequency.value = 52;
        var t0 = c.currentTime + when;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
        osc.connect(g); g.connect(c.destination);
        osc.start(t0); osc.stop(t0 + 0.3);
    }
    function heartBeat() {
        var vol = 0.25 + tension * 0.05;   // 越紧张越重
        thump(0, vol);
        thump(0.16, vol * 0.7);
    }
    function heartInterval() {
        return Math.max(480, 1500 - tension * 100); // tension10 → 500ms
    }
    function startHeart() {
        stopHeart();
        if (!enabled) return;
        var c = initCtx(); if (!c) return;
        function loop() {
            heartBeat();
            hbTimer = setTimeout(loop, heartInterval());
        }
        loop();
    }
    function stopHeart() { if (hbTimer) { clearTimeout(hbTimer); hbTimer = null; } }

    // —— 脚步声（噪声 + 带通） ——
    function footstep(step, when) {
        var c = initCtx(); if (!c || !enabled) return;
        var buf = getNoiseBuf(); if (!buf) return;
        var src = c.createBufferSource();
        src.buffer = buf;
        var bp = c.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 190; bp.Q.value = 1.2;
        var g = c.createGain();
        var t0 = c.currentTime + when;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
        src.connect(bp); bp.connect(g); g.connect(c.destination);
        src.start(t0); src.stop(t0 + 0.2);
        void step;
    }
    function footsteps(n) {
        for (var i = 0; i < n; i++) footstep(i, i * 0.55);
    }

    // —— 风声（循环噪声 + 低通 + LFO） ——
    function startWind() {
        stopWind();
        var c = initCtx(); if (!c || !enabled) return;
        var buf = getNoiseBuf(); if (!buf) return;
        var src = c.createBufferSource();
        src.buffer = buf; src.loop = true;
        var lp = c.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 320;
        windGain = c.createGain();
        windGain.gain.value = 0.035;
        var lfo = c.createOscillator();
        lfo.frequency.value = 0.18;
        var lfoGain = c.createGain();
        lfoGain.gain.value = 0.02;
        lfo.connect(lfoGain); lfoGain.connect(windGain.gain);
        src.connect(lp); lp.connect(windGain); windGain.connect(c.destination);
        src.start(); lfo.start();
    }
    function stopWind() { windGain = null; }

    // —— 惊吓：刺耳高音 + 画面闪烁 ——
    function scare() {
        var c = initCtx();
        if (c && enabled) {
            var osc = c.createOscillator();
            var g = c.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(880, c.currentTime);
            osc.frequency.exponentialRampToValueAtTime(220, c.currentTime + 0.3);
            g.gain.setValueAtTime(0.0001, c.currentTime);
            g.gain.exponentialRampToValueAtTime(0.35, c.currentTime + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.5);
            osc.connect(g); g.connect(c.destination);
            osc.start(); osc.stop(c.currentTime + 0.55);
            footsteps(2);
        }
        // 画面闪烁
        try {
            if (!flashStyleAdded) {
                var st = document.createElement('style');
                st.textContent = '.zs-flash{animation:zsflash 0.35s steps(2) 1;}@keyframes zsflash{0%{filter:brightness(2.4)}50%{filter:brightness(0.4)}100%{filter:none}}';
                document.head.appendChild(st);
                flashStyleAdded = true;
            }
            var b = document.body;
            b.classList.add('zs-flash');
            setTimeout(function () { b.classList.remove('zs-flash'); }, 400);
        } catch (e) {}
    }

    // —— 证据统计：自动提升紧张度 ——
    function evidenceCount() {
        var keys = ['zs_clue_grades', 'zs_clue_scriptbook', 'zs_clue_audit',
            'zs_clue_monitor', 'zs_clue_oldbuilding', 'zs_clue_clinic', 'zs_clue_forum'];
        var n = 0;
        keys.forEach(function (k) { try { if (localStorage.getItem(k) === '1') n++; } catch (e) {} });
        return n;
    }
    function autoTension() { return 2 + evidenceCount(); } // 2~9

    // —— 首次用户交互后启动（浏览器自动播放策略） ——
    function boot() {
        resume();
        if (enabled) startHeart();
    }
    document.addEventListener('pointerdown', boot, { passive: true });
    document.addEventListener('keydown', boot, { passive: true });

    // 切后台暂停心跳，切回按状态恢复
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) stopHeart(); else if (enabled) startHeart();
    });

    window.Sound = {
        init: boot,
        resume: resume,
        setEnabled: setEnabled,
        isEnabled: getEnabled,
        setTension: function (t) { tension = Math.max(0, Math.min(10, t)); },
        getTension: function () { return tension; },
        autoTension: autoTension,
        heartbeat: function (t) { if (t !== undefined) tension = t; startHeart(); },
        stopHeart: stopHeart,
        footsteps: footsteps,
        wind: startWind,
        stopWind: stopWind,
        scare: scare
    };
})();
