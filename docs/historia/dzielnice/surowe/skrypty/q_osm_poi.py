import json,time,urllib.request,urllib.parse
UA="sawa-hackathon/1.0 (Warsaw Open Data Hackathon 2026)"
D=["Wola","Śródmieście","Bielany","Bemowo","Żoliborz"]
out={}
for d in D:
    q=f'''[out:json][timeout:180];area["name"="Warszawa"]["admin_level"="6"]->.w;
rel(area.w)["boundary"="administrative"]["admin_level"="9"]["name"="{d}"];map_to_area->.a;
(nwr(area.a)["historic"];nwr(area.a)["memorial"];nwr(area.a)["tourism"~"artwork|museum|attraction|viewpoint"];
 nwr(area.a)["leisure"~"park|garden|sports_centre|stadium|pitch|nature_reserve"]["name"];nwr(area.a)["amenity"="place_of_worship"]["name"];
 nwr(area.a)["heritage"];nwr(area.a)["natural"~"tree|wood"]["name"];);out tags center;'''
    j=None
    for u in ["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter"]*3:
        try:
            j=json.load(urllib.request.urlopen(urllib.request.Request(u,data=urllib.parse.urlencode({"data":q}).encode(),headers={"User-Agent":UA}),timeout=240))
            if j["elements"]: break
        except Exception as ex: print("retry",u,ex,flush=True)
        time.sleep(25)
    out[d]=j["elements"] if j else []
    print(d,len(out[d]),flush=True); time.sleep(20)
json.dump(out,open("osm_poi.json","w"),ensure_ascii=False)
