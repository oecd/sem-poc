import sys
import json
import xml.etree.ElementTree as ET
from xml.etree.ElementTree import Element, SubElement

def load_keywords(infile):
    xml = ET.fromstring(infile.read())
    return get_scores(xml[0], "coverage") + get_scores(xml[0], "subject")

def get_score(el, attr):
    val = el.get(attr)
    try:
        return float(val) if val is not None else None
    except ValueError:
        return None

def get_scores(root, type):
    return [{
        "type": type,
        "name": el.text,
        "uri": el.get("uri"),
        "score": get_score(el, "score"),
        "zScore": get_score(el, "zScore"),
    } for el in root.findall(type)]

def main():
    with open(sys.argv[1]) as infile:
        kw = load_keywords(infile)

    if len(sys.argv) > 2:
        outfile = open(sys.argv[2], "w")
    else:
        outfile = sys.stdout

    json.dump(kw, outfile, indent=2)

if __name__ == '__main__':
    main()
