#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""至善中学网页解密 - 完整验证脚本
检查项：
  1. 所有 HTML 页面通过 HTTP 返回 200
  2. 内部链接 (href/src/location.href) 无断链
  3. 所有内联 <script> 通过 node --check 语法校验
用法: python verify.py [base_url]
"""
import re, glob, os, sys, subprocess, urllib.request

BASE = os.path.dirname(os.path.abspath(__file__))
BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8899"
pages = ["", "desk.html"] + [f"pages/{os.path.basename(p)}"
                             for p in sorted(glob.glob(os.path.join(BASE, "pages", "*.html")))]

fails = 0

# ── 1. HTTP 200 ──
print("== 1. HTTP 状态码 ==")
for p in pages:
    url = f"{BASE_URL}/{p}"
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            code = r.status
    except Exception as e:
        code = f"ERR({e})"
    ok = code == 200
    fails += (not ok)
    print(f"  {'✅' if ok else '❌'} {code}  /{p or 'index.html'}")

# ── 2. 断链检查 ──
print("== 2. 内部链接完整性 ==")
missing, checked = [], 0
for f in glob.glob(os.path.join(BASE, "**", "*.html"), recursive=True):
    html = open(f, encoding="utf-8").read()
    for m in re.findall(r'''(?:href|src)\s*=\s*["']([^"']+)["']|location\.href\s*=\s*["']([^"']+)["']''', html):
        t = m[0] or m[1]
        if t.startswith(("http", "//", "javascript:", "mailto:", "#")):
            continue
        if os.path.exists(os.path.normpath(os.path.join(os.path.dirname(f), t))):
            checked += 1
        else:
            missing.append((os.path.relpath(f, BASE), t))
if missing:
    fails += len(missing)
    for f, t in missing:
        print(f"  ❌ {f} -> {t}")
else:
    print(f"  ✅ {checked} 个内部链接全部有效，无断链")

# ── 3. JS 语法 ──
print("== 3. JS 语法 (node --check) ==")
js_fails = 0
for f in sorted(glob.glob(os.path.join(BASE, "**", "*.html"), recursive=True)):
    html = open(f, encoding="utf-8").read()
    for i, m in enumerate(re.findall(r"<script>(.*?)</script>", html, re.S)):
        s = m.strip()
        if not s:
            continue
        tmp = os.path.join(BASE, f"._check_{i}.js")
        open(tmp, "w", encoding="utf-8").write(s)
        r = subprocess.run(["node", "--check", tmp], capture_output=True, text=True)
        os.remove(tmp)
        if r.returncode != 0:
            js_fails += 1
            print(f"  ❌ {os.path.relpath(f, BASE)} script#{i}: {r.stderr.strip()[:300]}")
fails += js_fails
print(f"  {'✅ 全部内联脚本语法通过' if js_fails == 0 else f'❌ {js_fails} 个脚本有语法错误'}")

print("\n" + ("🎉 全部验证通过" if fails == 0 else f"❌ 共 {fails} 处问题"))
sys.exit(0 if fails == 0 else 1)
