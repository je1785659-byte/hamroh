# Prava va Sertifikat savollari: javob raqami variantlar ichidami, variantlar bo'sh/bir xil emasmi, izoh bormi, imtihon uchun mavzuda savol yetarlimi.
import json,glob,os,collections,sys
R=os.path.join(os.path.dirname(__file__),'..','..');iss=[];n=0
def one(src,q):
    o=q.get('o') or []
    if not str(q.get('q','')).strip() or len(o)<2 or not str(q.get('iz','')).strip(): iss.append((src,'matn/variant/izoh yetishmaydi'))
    if 'items' in q:
        A=[x.get('a') for x in q['items']]
        if not all(isinstance(a,int) and 0<=a<len(o) for a in A) or len(set(A))!=len(A): iss.append((src,'moslashtirish javoblari noto‘g‘ri'))
    elif not isinstance(q.get('a'),int) or not 0<=q['a']<len(o): iss.append((src,'javob raqami variantlar ichida emas'))
    if any(not str(x).strip() for x in o): iss.append((src,'bo‘sh variant'))
for f in sorted(glob.glob(R+'/prava/bilet-*.json')):
    for q in json.load(open(f)): n+=1;one(os.path.basename(f)+' '+q.get('id',''),q)
for f in sorted(glob.glob(R+'/sert/*.json')):
    d=json.load(open(f));tp={t[0] for t in d['topics']};cnt=collections.Counter()
    for i,q in enumerate(d['q']):
        n+=1;cnt[q.get('t')]+=1;src=os.path.basename(f)+' '+q.get('id',str(i));one(src,q)
        if q.get('t') not in tp: iss.append((src,'noma’lum mavzu'))
        if q.get('p') and q['p'] not in d['passages']: iss.append((src,'o‘qish matni topilmadi'))
    for ex,need in d['exam'].items():
        if isinstance(need,dict):
            for t,k in need.items():
                if cnt[t]<k: iss.append((os.path.basename(f),f'{ex}: {t} mavzusida savol yetmaydi ({cnt[t]}/{k})'))
print('savollar:',n,'| muammolar:',len(iss));[print(' ',x) for x in iss[:30]];sys.exit(1 if iss else 0)
