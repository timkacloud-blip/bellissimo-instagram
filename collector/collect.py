# -*- coding: utf-8 -*-
"""Сбор данных Instagram @bellissimouz через Graph API. Пишет data/*.csv и data/*.json.
Запуск: python3 collector/collect.py   (токен в META_TOKEN или ../meta_token.txt)"""
import os, sys, json, time, csv, io, datetime as dt, traceback
import requests
from sentiment import analyze

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data'); THUMBS = os.path.join(DATA, 'thumbs')
CFG = json.load(open(os.path.join(ROOT, 'config.json'), encoding='utf-8'))
IG = CFG['ig_user']; API = 'https://graph.facebook.com/v26.0/'
TOKEN = os.environ.get('META_TOKEN') or open(os.path.join(ROOT, '..', '..', 'meta_token.txt')).read().strip()
TZ = dt.timezone(dt.timedelta(hours=5))
NOW = dt.datetime.now(TZ); TODAY = NOW.date().isoformat()
STATUS = {'started': NOW.isoformat(timespec='minutes'), 'blocks': {}}
os.makedirs(THUMBS, exist_ok=True)
DEADLINE = time.time() + float(os.environ.get('MAX_SEC', 10**9))
def late(): return time.time() > DEADLINE

def get(path, **p):
    p['access_token'] = TOKEN
    for i in range(4):
        try:
            r = requests.get(API + path, params=p, timeout=90); d = r.json()
        except Exception as e:
            d = {'error': {'message': str(e), 'code': -1}}
        e = d.get('error')
        if not e: return d
        if e.get('code') in (4, 17, 32, 613, -1, 1, 2) and i < 3: time.sleep(20 * (i + 1)); continue
        raise RuntimeError(e.get('message', '')[:200].replace(TOKEN, '***'))
    raise RuntimeError('retries')

def pages(path, limit=0, **p):
    out = []; d = get(path, **p)
    while True:
        out += d.get('data', [])
        nxt = (d.get('paging') or {}).get('next')
        if not nxt or (limit and len(out) >= limit): return out
        for i in range(3):
            try: d = requests.get(nxt, timeout=90).json(); break
            except Exception: time.sleep(10)
        if 'error' in d: return out

def rcsv(name, key):
    p = os.path.join(DATA, name)
    if not os.path.exists(p): return {}
    return {r[key]: r for r in csv.DictReader(open(p, encoding='utf-8'))}

def wcsv(name, rows, cols, sort=None):
    rows = list(rows)
    if sort: rows.sort(key=lambda r: r.get(sort) or '')
    with open(os.path.join(DATA, name), 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction='ignore'); w.writeheader(); w.writerows(rows)

def block(name):
    def deco(fn):
        def run():
            t = time.time()
            try:
                info = fn() or {}; STATUS['blocks'][name] = {'ok': True, **info}
            except Exception as e:
                STATUS['blocks'][name] = {'ok': False, 'error': str(e)[:300]}
                traceback.print_exc()
            STATUS['blocks'][name]['sec'] = round(time.time() - t)
            print(name, STATUS['blocks'][name], flush=True)
        return run
    return deco

def thumb(mid, url):
    p = os.path.join(THUMBS, mid + '.jpg')
    if os.path.exists(p) or not url: return
    try:
        from PIL import Image
        r = requests.get(url, timeout=60)
        im = Image.open(io.BytesIO(r.content)).convert('RGB'); im.thumbnail((240, 240 * 16 // 9))
        im.save(p, 'JPEG', quality=72, optimize=True)
    except Exception as e:
        print('thumb fail', mid, str(e)[:80])

# ---------- аккаунт по дням ----------
ACC_COLS = ['date', 'reach', 'reach_ad', 'reach_reel', 'reach_story', 'reach_post', 'reach_follower', 'reach_nonfollower',
            'views', 'views_ad', 'views_reel', 'views_story', 'views_post', 'profile_views', 'website_clicks', 'profile_links_taps',
            'accounts_engaged', 'total_interactions', 'likes', 'comments', 'saves', 'shares', 'replies', 'reposts', 'new_followers']
TYPE = {'REEL': 'reel', 'STORY': 'story', 'POST': 'post', 'CAROUSEL_CONTAINER': 'post', 'AD': 'ad'}

def day_window(d):  # день Meta = сутки по тихоокеанскому времени, end_time 07:00 UTC следующего дня
    end = dt.datetime.fromisoformat(d + 'T07:00:00+00:00') + dt.timedelta(days=1)
    return int((end - dt.timedelta(days=1)).timestamp()), int(end.timestamp())

@block('account')
def account():
    rows = rcsv('account_daily.csv', 'date')
    last = (NOW - dt.timedelta(days=1)).date()
    want = [(last - dt.timedelta(days=i)).isoformat() for i in range(CFG['backfill_days'])]
    todo = [d for d in want if d not in rows or d >= (last - dt.timedelta(days=3)).isoformat()]
    for n, d in enumerate(sorted(todo, reverse=True)):
        if late(): break
        s, u = day_window(d); r = {'date': d}
        x = get(IG + '/insights', metric='reach,views', period='day', metric_type='total_value', breakdown='media_product_type', since=s, until=u)
        for m in x['data']:
            tv = m.get('total_value', {}); r[m['name']] = tv.get('value', 0)
            for b in (tv.get('breakdowns') or [{}])[0].get('results', []):
                k = m['name'] + '_' + TYPE.get(b['dimension_values'][0], 'other')
                if k in ACC_COLS: r[k] = int(r.get(k) or 0) + b['value']
        x = get(IG + '/insights', metric='reach', period='day', metric_type='total_value', breakdown='follow_type', since=s, until=u)
        for b in (x['data'][0]['total_value'].get('breakdowns') or [{}])[0].get('results', []):
            r['reach_' + b['dimension_values'][0].lower().replace('non_follower', 'nonfollower')] = b['value']
        x = get(IG + '/insights', metric='profile_views,website_clicks,profile_links_taps,accounts_engaged,total_interactions,likes,comments,saves,shares,replies,reposts',
                period='day', metric_type='total_value', since=s, until=u)
        for m in x['data']: r[m['name']] = m.get('total_value', {}).get('value', 0)
        old = rows.get(d, {}); r['new_followers'] = old.get('new_followers', '')
        rows[d] = r
        if n % 30 == 29: wcsv('account_daily.csv', rows.values(), ACC_COLS, 'date'); print('  account', d, flush=True)
    # новые подписчики: доступны только последние 30 дней
    x = get(IG + '/insights', metric='follower_count', period='day', since=int(time.time()) - 29 * 86400, until=int(time.time()))
    for v in x['data'][0]['values']:
        d = (dt.datetime.fromisoformat(v['end_time'].replace('+0000', '+00:00')) - dt.timedelta(days=1)).date().isoformat()
        if d in rows: rows[d]['new_followers'] = v['value']
    wcsv('account_daily.csv', rows.values(), ACC_COLS, 'date')
    # подписчики — снимок на сегодня
    me = get(IG, fields='followers_count,follows_count,media_count,username,profile_picture_url')
    fl = rcsv('followers.csv', 'date'); fl[TODAY] = {'date': TODAY, 'followers': me['followers_count'], 'media_count': me['media_count']}
    wcsv('followers.csv', fl.values(), ['date', 'followers', 'media_count'], 'date')
    return {'days_fetched': len(todo), 'followers': me['followers_count']}

# ---------- публикации ----------
MED_COLS = ['id', 'ts', 'media_type', 'product', 'permalink', 'caption', 'reach', 'views', 'likes', 'comments', 'saved', 'shares', 'reposts',
            'total_interactions', 'profile_visits', 'follows', 'avg_watch_ms', 'total_watch_ms', 'updated']
FEED_M = 'reach,views,likes,comments,saved,shares,reposts,total_interactions,profile_visits,follows'
REEL_M = 'reach,views,likes,comments,saved,shares,reposts,total_interactions,ig_reels_avg_watch_time,ig_reels_video_view_total_time'
REN = {'ig_reels_avg_watch_time': 'avg_watch_ms', 'ig_reels_video_view_total_time': 'total_watch_ms'}

@block('media')
def media():
    rows = rcsv('media.csv', 'id')
    cut = (NOW - dt.timedelta(days=CFG['media_days'])).isoformat()
    ref = (NOW - dt.timedelta(days=CFG['media_refresh_days'])).isoformat()
    lst = []
    d = get(IG + '/media', fields='id,timestamp,media_type,media_product_type,permalink,caption,thumbnail_url,media_url,like_count,comments_count', limit=50)
    while True:
        batch = d.get('data', []); lst += batch
        if not batch or batch[-1]['timestamp'] < cut: break
        nxt = (d.get('paging') or {}).get('next')
        if not nxt: break
        d = requests.get(nxt, timeout=90).json()
    n_ins = 0
    for i, m in enumerate(lst):
        if late(): break
        if i % 25 == 24: wcsv('media.csv', rows.values(), MED_COLS, 'ts')
        ts = dt.datetime.fromisoformat(m['timestamp'].replace('+0000', '+00:00')).astimezone(TZ).isoformat(timespec='minutes')
        if ts < cut: continue
        r = rows.get(m['id'], {})
        r.update({'id': m['id'], 'ts': ts, 'media_type': m['media_type'], 'product': m.get('media_product_type', ''), 'permalink': m['permalink'],
                  'caption': (m.get('caption') or '').replace('\r', ' ')[:600], 'likes': m.get('like_count', r.get('likes', '')), 'comments': m.get('comments_count', r.get('comments', ''))})
        if not r.get('updated') or ts >= ref:
            try:
                x = get(m['id'] + '/insights', metric=REEL_M if r['product'] == 'REELS' else FEED_M)
                for v in x['data']: r[REN.get(v['name'], v['name'])] = (v.get('values') or [{}])[0].get('value', 0)
                r['updated'] = TODAY; n_ins += 1
            except Exception as e:
                print('insights fail', m['id'], str(e)[:100])
        thumb(m['id'], m.get('thumbnail_url') or m.get('media_url'))
        rows[m['id']] = r
    wcsv('media.csv', rows.values(), MED_COLS, 'ts')
    json.dump([m['id'] for m in lst], open(os.path.join(DATA, '.media_ids.json'), 'w'))
    return {'posts': len(rows), 'insights_updated': n_ins}

# ---------- сторис (живут 24 часа — собираем каждые несколько часов) ----------
ST_COLS = ['id', 'ts', 'media_type', 'permalink', 'reach', 'views', 'replies', 'shares', 'total_interactions', 'follows', 'profile_visits',
           'tap_forward', 'tap_back', 'tap_exit', 'swipe_forward', 'updated']

@block('stories')
def stories():
    rows = rcsv('stories.csv', 'id'); n = 0
    for s in get(IG + '/stories', fields='id,timestamp,media_type,permalink,media_url,thumbnail_url').get('data', []):
        ts = dt.datetime.fromisoformat(s['timestamp'].replace('+0000', '+00:00')).astimezone(TZ).isoformat(timespec='minutes')
        r = rows.get(s['id'], {}); r.update({'id': s['id'], 'ts': ts, 'media_type': s['media_type'], 'permalink': s.get('permalink', '')})
        try:
            x = get(s['id'] + '/insights', metric='reach,views,replies,shares,total_interactions,follows,profile_visits')
            for v in x['data']: r[v['name']] = (v.get('values') or [{}])[0].get('value', 0)
            x = get(s['id'] + '/insights', metric='navigation', breakdown='story_navigation_action_type')
            for b in x['data'][0]['total_value']['breakdowns'][0]['results']: r[b['dimension_values'][0]] = b['value']
            r['updated'] = NOW.isoformat(timespec='minutes'); n += 1
        except Exception as e:
            print('story fail', s['id'], str(e)[:100])
        thumb(s['id'], s.get('thumbnail_url') or s.get('media_url'))
        rows[s['id']] = r
    wcsv('stories.csv', rows.values(), ST_COLS, 'ts')
    return {'live_now': n, 'total': len(rows)}

# ---------- аудитория ----------
@block('audience')
def audience():
    out = {'date': TODAY}
    for who, tf in (('follower_demographics', None), ('reached_audience_demographics', 'this_month'), ('engaged_audience_demographics', 'this_month')):
        out[who] = {}
        for b in ('age', 'gender', 'city'):
            p = dict(metric=who, period='lifetime', metric_type='total_value', breakdown=b)
            if tf: p['timeframe'] = tf
            x = get(IG + '/insights', **p)
            out[who][b] = {r['dimension_values'][0]: r['value'] for r in x['data'][0]['total_value']['breakdowns'][0]['results']}
        if who == 'follower_demographics':
            x = get(IG + '/insights', metric=who, period='lifetime', metric_type='total_value', breakdown='age,gender')
            out[who]['age_gender'] = {'|'.join(r['dimension_values']): r['value'] for r in x['data'][0]['total_value']['breakdowns'][0]['results']}
    json.dump(out, open(os.path.join(DATA, 'audience.json'), 'w'), ensure_ascii=False)
    os.makedirs(os.path.join(DATA, 'audience_hist'), exist_ok=True)
    if NOW.weekday() == 0 or not os.listdir(os.path.join(DATA, 'audience_hist')):
        json.dump(out, open(os.path.join(DATA, 'audience_hist', TODAY + '.json'), 'w'), ensure_ascii=False)
    return {}

# ---------- комментарии ----------
CM_COLS = ['id', 'media_id', 'ts', 'text', 'likes', 'answered', 'answer_min', 'tone', 'themes']

@block('comments')
def comments():
    rows = rcsv('comments.csv', 'id'); med = rcsv('media.csv', 'id')
    cut = (NOW - dt.timedelta(days=CFG['comments_days'])).isoformat(); n = 0
    for mid, m in med.items():
        if m['ts'] < cut or not int(m.get('comments') or 0): continue
        if late(): break
        for c in pages(mid + '/comments', fields='id,text,timestamp,like_count,username,replies{username,timestamp}', limit=500):
            if c.get('username') == CFG['own_username']: continue
            ts = dt.datetime.fromisoformat(c['timestamp'].replace('+0000', '+00:00'))
            ans = [dt.datetime.fromisoformat(x['timestamp'].replace('+0000', '+00:00')) for x in (c.get('replies') or {}).get('data', []) if x.get('username') == CFG['own_username']]
            tone, th = analyze(c.get('text', ''))
            rows[c['id']] = {'id': c['id'], 'media_id': mid, 'ts': ts.astimezone(TZ).isoformat(timespec='minutes'), 'text': (c.get('text') or '')[:500],
                             'likes': c.get('like_count', 0), 'answered': 1 if ans else 0,
                             'answer_min': round((min(ans) - ts).total_seconds() / 60) if ans else '', 'tone': tone, 'themes': '|'.join(th)}
            n += 1
    rows = {k: v for k, v in rows.items() if v['ts'] >= cut}
    wcsv('comments.csv', rows.values(), CM_COLS, 'ts')
    return {'comments': len(rows)}

# ---------- нас отметили ----------
@block('tags')
def tags():
    rows = rcsv('tags.csv', 'id')
    for t in pages(IG + '/tags', fields='id,timestamp,username,permalink,media_type,like_count,comments_count,caption', limit=100):
        rows[t['id']] = {'id': t['id'], 'ts': dt.datetime.fromisoformat(t['timestamp'].replace('+0000', '+00:00')).astimezone(TZ).isoformat(timespec='minutes'),
                         'username': t.get('username', ''), 'permalink': t.get('permalink', ''), 'media_type': t.get('media_type', ''),
                         'likes': t.get('like_count', ''), 'comments': t.get('comments_count', ''), 'caption': (t.get('caption') or '')[:300]}
    wcsv('tags.csv', rows.values(), ['id', 'ts', 'username', 'permalink', 'media_type', 'likes', 'comments', 'caption'], 'ts')
    return {'tags': len(rows)}

# ---------- конкуренты (публичные цифры) ----------
@block('competitors')
def competitors():
    daily = rcsv('comp_daily.csv', 'k'); cm = rcsv('comp_media.csv', 'id'); ok = []
    for u in [CFG['own_username']] + CFG['competitors']:
        try:
            x = get(IG, fields=f'business_discovery.username({u}){{username,name,followers_count,media_count,'
                                f'media.limit(40){{id,timestamp,media_type,media_product_type,like_count,comments_count,permalink,caption}}}}')['business_discovery']
        except Exception as e:
            print('comp fail', u, str(e)[:100]); continue
        daily[TODAY + u] = {'k': TODAY + u, 'date': TODAY, 'username': u, 'name': x.get('name', ''), 'followers': x['followers_count'], 'media_count': x['media_count']}
        for m in x.get('media', {}).get('data', []):
            cm[m['id']] = {'id': m['id'], 'username': u, 'ts': dt.datetime.fromisoformat(m['timestamp'].replace('+0000', '+00:00')).astimezone(TZ).isoformat(timespec='minutes'),
                           'product': m.get('media_product_type', ''), 'media_type': m.get('media_type', ''), 'likes': m.get('like_count', ''),
                           'comments': m.get('comments_count', ''), 'permalink': m.get('permalink', ''), 'caption': (m.get('caption') or '')[:300]}
        ok.append(u)
    wcsv('comp_daily.csv', daily.values(), ['k', 'date', 'username', 'name', 'followers', 'media_count'], 'k')
    cut = (NOW - dt.timedelta(days=120)).isoformat()
    wcsv('comp_media.csv', [r for r in cm.values() if r['ts'] >= cut], ['id', 'username', 'ts', 'product', 'media_type', 'likes', 'comments', 'permalink', 'caption'], 'ts')
    if len(ok) < 2: raise RuntimeError('собрано аккаунтов: %d' % len(ok))
    return {'accounts': len(ok)}

if __name__ == '__main__':
    only = sys.argv[1:]
    for name, fn in [('account', account), ('media', media), ('stories', stories), ('audience', audience), ('comments', comments), ('tags', tags), ('competitors', competitors)]:
        if not only or name in only: fn()
    STATUS['finished'] = dt.datetime.now(TZ).isoformat(timespec='minutes')
    prev = {}
    sp = os.path.join(DATA, 'status.json')
    if os.path.exists(sp): prev = json.load(open(sp)).get('blocks', {})
    prev.update(STATUS['blocks']); STATUS['blocks'] = prev
    json.dump(STATUS, open(sp, 'w'), ensure_ascii=False, indent=1)
