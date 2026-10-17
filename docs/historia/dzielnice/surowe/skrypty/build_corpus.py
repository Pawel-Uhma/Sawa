import json,re,os,html,urllib.parse,unicodedata,time,urllib.request
from libzim.reader import Archive
from shapely.geometry import Point,LineString
from shapely.ops import polygonize,unary_union
Z=Archive('/Users/pawel/Desktop/rozne/Lokalny Claude/wiedza/wikipedia_pl_all_nopic_2026-08.zim')
B=json.load(open('boundaries.json'))
POLY={}
for r in B['elements']:
    lines=[LineString([(p['lon'],p['lat']) for p in m['geometry']]) for m in r['members'] if m['type']=='way' and m.get('geometry')]
    POLY[r['tags']['name']]=unary_union(list(polygonize(unary_union(lines))))
def district(lat,lon):
    p=Point(lon,lat)
    for k,v in POLY.items():
        if v.contains(p): return k
def slug(s):
    s=unicodedata.normalize('NFKD',s.replace('ł','l').replace('Ł','L')).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+','-',s).strip('-')[:80]
def get(title):
    for t in [title.replace(' ','_'),title]:
        try:
            e=Z.get_entry_by_path(t)
            if e.is_redirect: e=e.get_redirect_entry()
            return e
        except KeyError: pass
def text(e):
    h=bytes(e.get_item().content).decode('utf-8','ignore')
    h=re.sub(r'(?s)<(script|style|table)[^>]*>.*?</\1>','',h)
    h=re.sub(r'(?s)<sup[^>]*class="[^"]*reference[^"]*".*?</sup>','',h)
    h=re.sub(r'<(br|/p|/li|/h[1-6]|/div)[^>]*>','\n',h)
    h=re.sub(r'<h([1-6])[^>]*>','\n## ',h)
    t=html.unescape(re.sub(r'<[^>]+>','',h))
    t=re.sub(r'\[\d+\]|\[edytuj[^\]]*\]','',t)
    t=re.sub(r'\n\s*\n+','\n\n',t).strip()
    for cut in ['\n## Przypisy','\n## Bibliografia','\n## Linki zewnętrzne']:
        i=t.find(cut)
        if i>0: t=t[:i]
    return t
# already collected near 42 Warsaw
existing=set()
for f in json.load(open('/Users/pawel/Desktop/Sawa/docs/historia/sawa-historia.geojson'))['features']:
    for z in f['properties'].get('zrodla',[]):
        if 'wikipedia.org/wiki/' in z['url']: existing.add(urllib.parse.unquote(z['url'].split('/wiki/')[1]).replace('_',' '))
docs={}  # title -> record
def add(title,kind,dist,lat,lon,extra=None):
    e=get(title)
    if not e: return False
    t=e.title
    if t in docs:
        docs[t]['dzielnice']=sorted(set(docs[t]['dzielnice'])|{dist}); return True
    body=text(e)
    if len(body)<300: return False
    docs[t]={'title':t,'url':'https://pl.wikipedia.org/wiki/'+urllib.parse.quote(t.replace(' ','_')),'kind':kind,'dzielnice':[dist],'lat':lat,'lon':lon,'juz_w_bazie':t in existing,'text':body,**(extra or {})}
    return True
S=json.load(open('streets_osm.json'))
SKIP=re.compile(r'^(Most|Tunel|Wiadukt|Estakada|Rondo)\b')
miss={}
for d,lst in S.items():
    miss[d]=[]
    for s in lst:
        n=s['nazwa']; ok=False
        cands=[]
        if s.get('wikipedia') and s['wikipedia'].startswith('pl:'): cands.append(s['wikipedia'][3:])
        cap=n[0].upper()+n[1:]
        if re.match(r'^(aleja|plac|skwer|rondo|bulwar|most|park|pasaż|trakt|wybrzeże|zaułek|ulica|osiedle)\b',n,re.I): cands+= [cap+' w Warszawie',cap]
        else: cands+=['Ulica '+n+' w Warszawie','Aleja '+n+' w Warszawie']
        for c in cands:
            if add(c,'ulica',d,s['lat'],s['lon'],{'osm_nazwa':n}): ok=True;break
        if not ok: miss[d].append(n)
print('streets found',sum(1 for v in docs.values() if v['kind']=='ulica'))
W=json.load(open('wikidata_box.json'))
nodist=0
for r in W:
    m=re.match(r'Point\(([-\d.]+) ([-\d.]+)\)',r['coord']['value'])
    lon,lat=float(m[1]),float(m[2]); d=district(lat,lon)
    if not d: nodist+=1; continue
    title=urllib.parse.unquote(r['article']['value'].split('/wiki/')[1]).replace('_',' ')
    add(title,'obiekt',d,lat,lon,{'wikidata':r['item']['value'].split('/')[-1]})
print('total',len(docs),'outside',nodist)
os.makedirs('corpus',exist_ok=True)
idx=[]
for t,v in docs.items():
    fn=f"corpus/{slug(t)}.txt"
    open(fn,'w').write(f"TYTUŁ: {t}\nURL: {v['url']}\nWSPÓŁRZĘDNE: {v['lat']}, {v['lon']}\nDZIELNICE: {', '.join(v['dzielnice'])}\nRODZAJ: {v['kind']}\n\n{v['text']}\n")
    idx.append({k:v[k] for k in v if k!='text'}|{'plik':fn,'znaki':len(v['text'])})
json.dump(idx,open('corpus_index.json','w'),ensure_ascii=False,indent=1)
json.dump(miss,open('streets_missing.json','w'),ensure_ascii=False,indent=1)
import collections
c=collections.Counter((v['dzielnice'][0],v['kind']) for v in docs.values()); print(sorted(c.items()))
print('juz w bazie',sum(v['juz_w_bazie'] for v in docs.values()), 'chars',sum(len(v['text']) for v in docs.values()))
