# build_cat_to_name_from_vgg.py
import urllib.request, re, json, pathlib, sys

VGG_URL = "https://www.robots.ox.ac.uk/~vgg/data/flowers/102/categories.html"
GIST_URL = "https://gist.githubusercontent.com/JosephKJ/94c7728ed1a8e0cd87fe6a029769cde1/raw/Oxford-102_Flower_dataset_labels.txt"

def fetch(url):
    return urllib.request.urlopen(url, timeout=30).read().decode("utf-8", "ignore")

def parse_from_vgg(html:str):
    names = []
    # 패턴 A: ...>Image:</a>  NAME  NUMBER<
    for m in re.finditer(r'>\s*Image:\s*</a>\s*([^<>\n\r]+?)\s*\d+\s*<', html, re.IGNORECASE):
        t = m.group(1).strip()
        if t:
            names.append(t)
    # 패턴 B: 테이블 셀 내 연속 텍스트(여분 공백/개행 포함) 처리 보강
    if len(names) < 102:
        names = []
        # 세 칼럼 반복을 고려해 NAME 다음에 숫자가 오는 모든 구간 집계
        for m in re.finditer(r'>(?:Image:\s*)?</a>\s*([^<>\n\r]+?)\s*\d+\s*<', html, re.IGNORECASE):
            t = m.group(1).strip()
            if t and not t.lower().startswith("image:"):
                names.append(t)
    return names[:102]

def parse_from_gist(text:str):
    # Gist는 줄마다 'name' 또는 "name" 형태
    out=[]
    for line in text.splitlines():
        line=line.strip()
        if not line: 
            continue
        m = re.match(r"""['"]\s*(.+?)\s*['"]\s*,?\s*$""", line)
        if m:
            out.append(m.group(1))
    return out[:102]

def main():
    # 1) VGG 공식 페이지 시도
    try:
        html = fetch(VGG_URL)
        names = parse_from_vgg(html)
    except Exception as e:
        names = []
    # 2) 실패 시 Gist 백업
    if len(names) < 102:
        try:
            gist = fetch(GIST_URL)
            names = parse_from_gist(gist)
        except Exception:
            names = []

    if len(names) != 102:
        print(f"[error] parsed {len(names)} names, expected 102. 네트워크/페이지 구조를 확인하세요.", file=sys.stderr)
        sys.exit(1)

    mapping = {str(i+1): names[i] for i in range(102)}
    pathlib.Path("cat_to_name.json").write_text(json.dumps(mapping, ensure_ascii=False, indent=2), encoding="utf-8")
    pathlib.Path("classes.txt").write_text("\n".join(names), encoding="utf-8")
    print("[ok] saved cat_to_name.json, classes.txt")

if __name__ == "__main__":
    main()