import sys
import json
import xml.etree.ElementTree as ET
from xml.etree.ElementTree import Element, SubElement

def count_words(infile):
    xml = ET.fromstring(infile.read())
    ids = [el.get("concept-id") for el in xml.iter("{http://67bricks.com/annotation/}annotation")]
    histogram = {}
    for id in ids:
        histogram[id] = histogram.get(id, 0) + 1
    return histogram

def main():
    with open(sys.argv[1]) as infile:
        kw = count_words(infile)

    if len(sys.argv) > 2:
        outfile = open(sys.argv[2], "w")
    else:
        outfile = sys.stdout

    json.dump(kw, outfile, indent=2)

if __name__ == '__main__':
    main()
