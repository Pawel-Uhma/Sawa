import json,glob,re,math,collections,sys
from shapely.geometry import Point,LineString
from shapely.ops import polygonize,unary_union
POLY={}
for r in json.load(open('boundaries.json'))['elements']:
    lines=[LineString([(p['lon'],p['lat']) for p in m['geometry']]) for m in r['members'] if m['type']=='way' and m.get('geometry')]
    POLY[r['tags']['name']]=unary_union(list(polygonize(unary_union(lines))))
def district(lat,lon):
    p=Point(lon,lat)
    for k,v in POLY.items():
        if v.contains(p): return k
    near=[(v.distance(p),k) for k,v in POLY.items()]
    dd,k=min(near)
    if dd<0.005: return k
generic=0;outside=[]
DST={'Bemowo':r'Bemow','Białołęka':r'Białołęk','Bielany':r'\bBielan(y|ach|ami|om)\b','Mokotów':r'Mokot[óo]w','Ochota':r'\bOchot','Praga':r'\bPrag(a|i|ę|ą|dze)\b','Rembertów':r'Rembert','Śródmieście':r'Śródmie','Targówek':r'Targ[óo]w','Ursus':r'\bUrsus','Ursynów':r'Ursyn','Wawer':r'\bWaw(er|r)','Wesoła':r'\bWesoł','Wilanów':r'Wilan[óo]w','Włochy':r'\bWłoch','Wola':r'\bWol(a|i|ę|ą)\b','Żoliborz':r'Żolibor'}
TGT=['Wola','Bemowo','Bielany','Żoliborz','Śródmieście']
CI={}
for x in json.load(open('corpus_index.json')): CI[x['url']]=x
SO=json.load(open('streets_osm.json'))
CEN={(d,s['nazwa']):(s['lat'],s['lon']) for d,l in SO.items() for s in l}
TAGGED={(d,s['nazwa']) for d,l in SO.items() for s in l if s.get('wikipedia')}
LEAD={}
def lead(x):
    if x['url'] not in LEAD:
        t=open(x['plik']).read().partition('\n\n')[2][:2500]
        LEAD[x['url']]={d for d,p in DST.items() if re.search(p,t)}
    return LEAD[x['url']]
moved=dropped=0
R='/Users/pawel/Desktop/Sawa/docs/historia/dzielnice/'
recs=[];bad=[]
for f in sorted(glob.glob(R+'surowe/b*-*.json')):
    try: arr=json.load(open(f))
    except Exception as e: bad.append((f,str(e)));continue
    if isinstance(arr,dict): arr=arr.get('rekordy') or arr.get('records') or [arr]
    for r in arr:
        if isinstance(r,dict): r['_plik']=f.split('/')[-1]; recs.append(r)
ex=set(f['properties']['id'] for f in json.load(open('/Users/pawel/Desktop/Sawa/docs/historia/sawa-historia.geojson'))['features'])
by={}
for r in recs:
    try: lat=float(r['lat']);lon=float(r['lon'])
    except: continue
    if not (52.15<lat<52.40 and 20.80<lon<21.10): continue
    if abs(lat-52.232222)<0.0003 and abs(lon-21.008333)<0.0003: generic+=1; continue
    d0=district(lat,lon)
    if not d0: outside.append((r.get("id"),lat,lon)); continue
    r['dzielnica']=d0
    src=next((CI[z.get('url')] for z in (r.get('zrodla') or []) if isinstance(z,dict) and z.get('url') in CI),None)
    if src and src['kind']=='ulica' and (d0,src.get('osm_nazwa')) not in TAGGED:
        m=lead(src)
        if m and d0 not in m:
            alt=[d for d in TGT if d in m and (d,src.get('osm_nazwa')) in CEN]
            if alt:
                lat,lon=CEN[(alt[0],src['osm_nazwa'])]; r['lat'],r['lon']=lat,lon; r['dzielnica']=alt[0]; moved+=1
            else: dropped+=1; continue
    fakty=[x for x in (r.get('fakty') or []) if isinstance(x,str) and len(x)>20]
    if not fakty or not r.get('zrodla'): continue
    i=r.get('id') or ''
    i=re.sub(r'[^a-z0-9-]','',i.lower())
    if i in ex: i=i+'-'+re.sub(r'[^a-z]','',(r.get('dzielnica') or 'x').lower())[:6]
    if i in by:
        o=by[i]; o['fakty']=list(dict.fromkeys(o['fakty']+fakty)); o['ciekawostki']=list(dict.fromkeys((o.get('ciekawostki') or [])+(r.get('ciekawostki') or [])))
        o['zrodla']+= [z for z in r['zrodla'] if z not in o['zrodla']]; continue
    r['id']=i; r['fakty']=fakty; by[i]=r
feats=[]
for r in by.values():
    p={k:v for k,v in r.items() if k not in ('lat','lon','_plik','odleglosc_m')}
    p['zrodlo_rekordu']='wikipedia-zim-dzielnice'
    feats.append({'type':'Feature','geometry':{'type':'Point','coordinates':[round(float(r['lon']),6),round(float(r['lat']),6)]},'properties':p})
gj={'type':'FeatureCollection','name':'sawa-dzielnice','metadata':{'dzielnice':['Wola','Bemowo','Bielany','Żoliborz','Śródmieście'],'zebrano':'2026-10-17','uwaga':'Fakty wyciągnięte przez agentów Haiku z lokalnego zrzutu polskiej Wikipedii (ZIM 2026-08). Licencja CC BY-SA, podpis w zrodla.','zrodla':'Wikipedia (ZIM), Wikidata, OSM'},'features':feats}
json.dump(gj,open(R+'sawa-dzielnice.geojson','w'),ensure_ascii=False,indent=1)
c=collections.Counter(f['properties'].get('dzielnica') for f in feats)
print('rekordy surowe',len(recs),'po scaleniu',len(feats),dict(c),'fakty',sum(len(f['properties']['fakty']) for f in feats),'zle pliki',bad,'punkt ogolny Warszawy (pominiete)',generic,'ulice przeniesione',moved,'ulice z innej dzielnicy (pominiete)',dropped)
print("poza 5 dzielnicami",len(outside),outside[:40])
# weryfikacja lat w faktach względem tekstu źródłowego (lokalny ZIM)
TXT={}
def src_text(p):
    out=''
    for z in p.get('zrodla',[]):
        x=CI.get(z.get('url') if isinstance(z,dict) else None)
        if x:
            if x['url'] not in TXT: TXT[x['url']]=open(x['plik']).read()
            out+=TXT[x['url']]
    return out
nf=nv=0
for f in gj['features']:
    p=f['properties']; t=src_text(p)
    if not t: continue
    ok=[];bad=[]
    for fa in p['fakty']+(p.get('ciekawostki') or []):
        yrs=re.findall(r'\b(1[0-9]{3}|20[0-2][0-9])\b',fa)
        miss=[y for y in yrs if y not in t]
        (bad.append({'tekst':fa,'brak_w_zrodle':miss}) if miss else None)
    if bad:
        badt={b['tekst'] for b in bad}
        p['fakty']=[x for x in p['fakty'] if x not in badt]
        p['ciekawostki']=[x for x in (p.get('ciekawostki') or []) if x not in badt]
        p['do_weryfikacji']=bad; nv+=len(bad)
    nf+=len(p['fakty'])
gj['features']=[f for f in gj['features'] if f['properties']['fakty']]
for f in gj['features']:
    p=f['properties']
    if not isinstance(p.get('istnieje'),bool): p.pop('istnieje',None)
json.dump(gj,open(R+'sawa-dzielnice.geojson','w'),ensure_ascii=False,indent=1)
c=collections.Counter(f['properties']['dzielnica'] for f in gj['features'])
print('PO WERYFIKACJI: miejsc',len(gj['features']),dict(c),'faktow',nf,'do_weryfikacji',nv)
print(collections.Counter(f['properties']['typ'] for f in gj['features']).most_common())
def norm(fn):
    g=json.load(open(fn))
    for f in g['features']:
        p=f['properties']
        if p['typ']=='nieistniejacy-budynek': p['typ']='budynek'; p['istnieje']=False
        elif p['typ']=='park': p['typ']='miejsce'; p['tagi']=sorted(set((p.get('tagi') or [])+['nature']))
        elif p['typ']=='sport': p['typ']='miejsce'; p['tagi']=sorted(set((p.get('tagi') or [])+['sport']))
    json.dump(g,open(fn,'w'),ensure_ascii=False,indent=1)
norm(R+'sawa-dzielnice.geojson'); norm(R+'osm-dzielnice.geojson')
