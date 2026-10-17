import json,re,unicodedata,collections
D=json.load(open('osm_poi.json'))
def slug(s):
    s=unicodedata.normalize('NFKD',s.replace('ł','l').replace('Ł','L')).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+','-',s).strip('-')[:70]
SKIPH={'tomb','yes','boundary_stone','milestone','railway_car','tank','cannon','aircraft','vehicle','locomotive','building'}
feats=[];seen=set();cnt=collections.Counter()
for dist,els in D.items():
    for e in els:
        t=e['tags']; lat=e.get('lat') or e.get('center',{}).get('lat'); lon=e.get('lon') or e.get('center',{}).get('lon')
        if lat is None: continue
        h=t.get('historic'); le=t.get('leisure'); tu=t.get('tourism'); n=t.get('name'); ins=t.get('inscription')
        tagi=None; typ=None
        if le in ('park','garden','nature_reserve') or t.get('natural') in ('wood','tree'): typ='miejsce'; tagi=['nature']
        elif le in ('sports_centre','stadium','pitch'): typ='sport'; tagi=['sport']
        elif h=='memorial' or t.get('memorial'):
            m=t.get('memorial'); typ={'plaque':'tablica','statue':'pomnik','bust':'pomnik','stone':'pomnik','cross':'pomnik','war_memorial':'pomnik','stolperstein':'tablica'}.get(m,'pomnik')
        elif tu=='artwork': typ='mural' if t.get('artwork_type')=='mural' else 'pomnik'
        elif t.get('amenity')=='place_of_worship': typ='swiatynia'
        elif h in ('wayside_shrine','wayside_cross'): typ='pomnik'
        elif h in ('fort','ruins','castle','manor','monument','church','bunker','city_gate','archaeological_site'): typ='nieistniejacy-budynek' if h=='ruins' else 'budynek'
        elif tu=='museum': typ='budynek'
        else: continue
        if h in SKIPH and typ not in ('tablica','pomnik','mural'): continue
        fakty=[]
        if ins: fakty.append(f'Napis: „{ins.strip()}”.')
        sub=t.get('subject') or t.get('memorial:subject') or t.get('name:etymology')
        if sub: fakty.append(f'Upamiętnia: {sub}.')
        if t.get('start_date'): fakty.append(f'Data powstania wg OSM: {t["start_date"]}.')
        if t.get('artist_name'): fakty.append(f'Autor: {t["artist_name"]}.')
        if t.get('architect'): fakty.append(f'Architekt: {t["architect"]}.')
        if t.get('opening_hours') and tagi: fakty.append(f'Godziny otwarcia: {t["opening_hours"]}.')
        if t.get('sport'): fakty.append(f'Sport: {t["sport"].replace(";",", ")}.')
        if t.get('description'): fakty.append(t['description'].strip())
        if t.get('heritage') and t.get('ref:zabytek'): fakty.append(f'Zabytek wpisany do rejestru (nr {t["ref:zabytek"]}).')
        if not n and not ins: continue
        if not fakty and not (tagi and n): continue
        if typ=='sport' and le=='pitch' and not n: continue
        nazwa=n or (('Tablica: '+ins[:60]+'…') if ins else typ)
        key=(slug(nazwa),round(lat,3),round(lon,3))
        if key in seen: continue
        seen.add(key)
        url=f"https://www.openstreetmap.org/{e['type']}/{e['id']}"
        zr=[{'tytul':'OpenStreetMap','url':url}]
        if t.get('wikipedia','').startswith('pl:'): zr.append({'tytul':'Wikipedia: '+t['wikipedia'][3:],'url':'https://pl.wikipedia.org/wiki/'+t['wikipedia'][3:].replace(' ','_')})
        p={'id':f"osm-{slug(nazwa)}-{e['id']}"[:90],'nazwa':nazwa,'typ':typ,'dzielnica':dist,'adres_dzis':' '.join(x for x in [t.get('addr:street'),t.get('addr:housenumber')] if x) or None,
           'lokalizacja':'dokladna','fakty':fakty,'zrodla':zr,'pewnosc':'srednia','zrodlo_rekordu':'osm-dzielnice'}
        if tagi: p['tagi']=tagi
        feats.append({'type':'Feature','geometry':{'type':'Point','coordinates':[round(lon,6),round(lat,6)]},'properties':p}); cnt[(dist,typ)]+=1
json.dump({'type':'FeatureCollection','name':'osm-dzielnice','metadata':{'zebrano':'2026-10-17','zrodla':'OpenStreetMap (ODbL), Overpass API','uwaga':'Fakty to dosłowne tagi OSM: napis, data, autor, sport, godziny.'},'features':feats},open('/Users/pawel/Desktop/Sawa/docs/historia/dzielnice/osm-dzielnice.geojson','w'),ensure_ascii=False,indent=1)
print(len(feats));print(sorted(cnt.items()))
