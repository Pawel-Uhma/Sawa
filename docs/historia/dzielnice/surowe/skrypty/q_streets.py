import json,sys,time,urllib.request,urllib.parse
UA="sawa-hackathon/1.0 (Warsaw Open Data Hackathon 2026)"
D=["Wola","Bemowo"]
out={}
for d in D:
    q=f'''[out:json][timeout:120];
area["name"="Warszawa"]["admin_level"="6"]->.w;
rel(area.w)["boundary"="administrative"]["admin_level"="9"]["name"="{d}"];map_to_area->.a;
(way(area.a)["highway"]["name"];way(area.a)["place"="square"]["name"];rel(area.a)["place"="square"]["name"];);
out tags center;'''
    data=urllib.parse.urlencode({"data":q}).encode()
    j=None
    for i,u in enumerate(["https://overpass.private.coffee/api/interpreter","https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter"]*2):
        try:
            r=urllib.request.urlopen(urllib.request.Request(u,data=data,headers={"User-Agent":UA}),timeout=180); j=json.load(r); print("remark",j.get("remark"),len(j["elements"]),flush=True); break
        except Exception as ex:
            print("retry",u,ex,flush=True); time.sleep(20)
    st={}
    for e in j["elements"]:
        t=e.get("tags",{}); n=t["name"]; c=e.get("center",{})
        s=st.setdefault(n,{"nazwa":n,"lat":c.get("lat"),"lon":c.get("lon"),"wikipedia":t.get("wikipedia") or t.get("name:etymology:wikipedia"),"wikidata":t.get("wikidata"),"etymology_wikidata":t.get("name:etymology:wikidata"),"n":0})
        s["n"]+=1
        for k in ["wikipedia","wikidata","etymology_wikidata"]:
            pass
    out[d]=sorted(st.values(),key=lambda x:x["nazwa"])
    print(d,len(out[d]),flush=True)
    time.sleep(15)
json.dump(out,open("streets_part2.json","w"),ensure_ascii=False,indent=1)
