# -*- coding: utf-8 -*-
"""修正 sound.js 注入路径：pages/ 下用 ../sound.js，根目录用 sound.js"""
import glob, re, os

fixed = 0
for f in glob.glob(os.path.join('**', '*.html'), recursive=True):
    s = open(f, encoding='utf-8').read()
    is_pages = f.replace(os.sep, '/').startswith('pages/')
    prefix = '../' if is_pages else ''
    tag = '<script src="' + prefix + 'sound.js"></script>'
    # 删除所有已存在的 sound.js 标签（任意相对路径）
    s = re.sub(r'<script src="(?:\.\./)?sound\.js"></script>', '', s)
    # 注入到 </head> 前
    if '</head>' in s and 'sound.js' not in s:
        s = s.replace('</head>', tag + '\n</head>', 1)
        fixed += 1
    open(f, 'w', encoding='utf-8').write(s)

print('修正注入', fixed, '个页面')
