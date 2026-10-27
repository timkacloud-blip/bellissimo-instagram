# -*- coding: utf-8 -*-
"""Собирает _site/index.html из data/*. Запуск: python3 collector/build.py"""
import os, csv, json, re, shutil, datetime as dt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data'); SITE = os.path.join(ROOT, '_site')
CFG = json.load(open(os.path.join(ROOT, 'config.json'), encoding='utf-8'))

def rows(name):
    p = os.path.join(DATA, name)
    return list(csv.DictReader(open(p, encoding='utf-8'))) if os.path.exists(p) else []

def num(v):
    if v in (None, ''): return None
    try:
        f = float(v); return int(f) if f == int(f) else round(f, 2)
    except ValueError: return None

# рубрики по словам в подписи
from sentiment import norm
RUB = [(name, [norm(w.strip()) for w in words.split(',') if w.strip()]) for name, words in CFG['rubrics']]
def rubric(caption):
    t = norm(caption or '')
    for name, ws in RUB:
        if any(w in t for w in ws): return name
    return CFG['rubric_default']

FMT = {('REELS', 'VIDEO'): 'Reels', ('FEED', 'CAROUSEL_ALBUM'): 'Карусель', ('FEED', 'IMAGE'): 'Фото', ('FEED', 'VIDEO'): 'Видео'}
os.makedirs(os.path.join(SITE, 'thumbs'), exist_ok=True)
have_thumb = set(f[:-4] for f in os.listdir(os.path.join(DATA, 'thumbs'))) if os.path.isdir(os.path.join(DATA, 'thumbs')) else set()
used = set()

def short(cap, n=160):
    cap = re.sub(r'\s+', ' ', cap or '').strip()
    return cap if len(cap) <= n else cap[:n].rsplit(' ', 1)[0] + '…'

ACC_NUM = [c for c in (rows('account_daily.csv')[:1] or [{}])[0].keys() if c != 'date']
acc = [[r['date']] + [num(r.get(c)) for c in ACC_NUM] for r in rows('account_daily.csv')]

posts = []
for r in rows('media.csv'):
    t = r['id'] in have_thumb
    if t: used.add(r['id'])
    posts.append({'id': r['id'], 'ts': r['ts'], 'fmt': FMT.get((r['product'], r['media_type']), r['media_type'].title()), 'rub': rubric(r['caption']),
                  'cap': short(r['caption']), 'url': r['permalink'], 'th': t,
                  **{k: num(r.get(k)) for k in ('reach', 'views', 'likes', 'comments', 'saved', 'shares', 'reposts', 'total_interactions', 'profile_visits', 'follows')},
                  'watch': round(num(r.get('avg_watch_ms')) / 1000, 1) if num(r.get('avg_watch_ms')) else None})

stories = []
for r in rows('stories.csv'):
    t = r['id'] in have_thumb
    if t: used.add(r['id'])
    stories.append({'id': r['id'], 'ts': r['ts'], 'type': r['media_type'], 'th': t,
                    **{k: num(r.get(k)) for k in ('reach', 'views', 'replies', 'shares', 'total_interactions', 'follows', 'profile_visits', 'tap_forward', 'tap_back', 'tap_exit', 'swipe_forward')}})

comments = [{'ts': r['ts'], 'm': r['media_id'], 'tx': r['text'], 'tone': r['tone'], 'th': [x for x in r['themes'].split('|') if x],
             'ans': r['answered'] == '1', 'am': num(r['answer_min']), 'lk': num(r['likes'])} for r in rows('comments.csv')]

tags = [{'ts': r['ts'], 'u': r['username'], 'url': r['permalink'], 'type': r['media_type'], 'lk': num(r['likes']), 'cm': num(r['comments']),
         'cap': short(r['caption'], 120)} for r in rows('tags.csv')]

comp_daily = [{'d': r['date'], 'u': r['username'], 'n': r['name'], 'f': num(r['followers']), 'mc': num(r['media_count'])} for r in rows('comp_daily.csv')]
comp_media = [{'u': r['username'], 'ts': r['ts'], 'p': r['product'], 'lk': num(r['likes']), 'cm': num(r['comments']), 'url': r['permalink'],
               'cap': short(r['caption'], 140)} for r in rows('comp_media.csv')]

fol = [[r['date'], num(r['followers'])] for r in rows('followers.csv')]
aud = json.load(open(os.path.join(DATA, 'audience.json'), encoding='utf-8')) if os.path.exists(os.path.join(DATA, 'audience.json')) else {}
status = json.load(open(os.path.join(DATA, 'status.json'), encoding='utf-8')) if os.path.exists(os.path.join(DATA, 'status.json')) else {}

for i in used:
    src = os.path.join(DATA, 'thumbs', i + '.jpg'); dst = os.path.join(SITE, 'thumbs', i + '.jpg')
    if not os.path.exists(dst): shutil.copyfile(src, dst)

D = {'built': dt.datetime.now(dt.timezone(dt.timedelta(hours=5))).isoformat(timespec='minutes'), 'own': CFG['own_username'],
     'acc_cols': ACC_NUM, 'acc': acc, 'fol': fol, 'posts': posts, 'stories': stories, 'comments': comments, 'tags': tags,
     'comp_daily': comp_daily, 'comp_media': comp_media, 'aud': aud, 'status': status}

tpl = open(os.path.join(ROOT, 'site', 'index.html'), encoding='utf-8').read()
js = open(os.path.join(ROOT, 'site', 'app.js'), encoding='utf-8').read()
logo = open(os.path.join(ROOT, 'site', 'logo.svg'), encoding='utf-8').read()
data = json.dumps(D, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
html = tpl.replace('/*DATA*/', 'window.D=' + data + ';').replace('/*APP*/', js).replace('<!--LOGO-->', logo)
open(os.path.join(SITE, 'index.html'), 'w', encoding='utf-8').write(html)
print('built', len(html) // 1024, 'KB; posts', len(posts), 'stories', len(stories), 'comments', len(comments), 'thumbs', len(used))
