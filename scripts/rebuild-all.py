#!/usr/bin/env python3
"""Rebuild ALL YAML files from one ultra-clean template."""
import os, json

D = os.path.join(os.path.dirname(__file__), '..', 'data', 'procedures')
os.makedirs(D, exist_ok=True)

# Read template from separate file
template_path = os.path.join(os.path.dirname(__file__), 'template.yaml')
with open(template_path, 'r', encoding='utf-8') as f:
    T = f.read()

P = {
    'retired-worker': ('退休企业职工', '在杭州市参加城镇职工养老保险并已办理退休的企业退休人员',
                       '    - 逝者在杭州缴纳社保满15年\n    - 逝者有配偶或一名成年子女可代办'),
    'active-worker': ('在职企业职工', '在杭州市参加城镇职工养老保险并在职的企业职工',
                      '    - 逝者在杭州缴纳社保\n    - 逝者有配偶或一名成年子女可代办'),
    'urban-resident': ('城乡居民', '在杭州市参加城乡居民养老保险或未参加职工养老保险的城乡居民',
                       '    - 逝者未参加城镇职工养老保险\n    - 逝者有配偶或一名成年子女可代办'),
    'civil-servant': ('公务员', '在杭州市机关事业单位工作的在编公务员',
                      '    - 逝者为杭州市在编公务员\n    - 逝者有配偶或一名成年子女可代办'),
    'military': ('军人（现役/退役军人）', '在杭州市居住的现役军人或退役军人',
                 '    - 逝者为现役军人或已退役的退伍军人\n    - 逝者有配偶或一名成年子女可代办'),
}

# Write hangzhou templates
for pid, (name, desc, assumptions) in P.items():
    c = T.format(pid=pid, name=name, desc=desc, assumptions=assumptions)
    fp = os.path.join(D, f'hangzhou-{pid}.yaml')
    with open(fp, 'w', encoding='utf-8') as f:
        f.write(c)
    import yaml
    with open(fp, 'r', encoding='utf-8') as f:
        yaml.safe_load(f)
    print(f'OK hangzhou-{pid}.yaml')

# Load verified data
cache = os.path.join(os.path.dirname(__file__), '..', '.cache', 'verified-funeral-data.json')
with open(cache, 'r', encoding='utf-8') as f:
    SAVED = json.load(f)

# Generate all other cities
count = 0
for city in sorted(SAVED.keys()):
    if city == 'hangzhou':
        continue
    data = SAVED.get(city, {})
    sn = str(data.get('name', ''))
    sa = str(data.get('addr', ''))
    sp = str(data.get('phone', ''))

    for pid in P:
        name, desc, assumptions = P[pid]
        c = T.format(pid=pid, name=name, desc=desc, assumptions=assumptions)
        c = c.replace('city: hangzhou', f'city: {city}')
        if sn and '殡仪' in sn:
            c = c.replace('name: 杭州市殡仪馆', f'name: {sn}')
        if sa and len(sa) > 10:
            c = c.replace('address: 杭州市西湖区西溪路731号', f'address: {sa}')
        if sp and len(sp) > 5:
            c = c.replace("phone: '0571-85220000'", f"phone: '{sp}'")

        fp = os.path.join(D, f'{city}-{pid}.yaml')
        with open(fp, 'w', encoding='utf-8') as f:
            f.write(c)
        count += 1

print(f'Generated {count} files')
print(f'Total: {len(os.listdir(D))}')
