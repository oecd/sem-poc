import csv
import json
import sys

headings = ["name", "iso", "bli", "oecd", "stat", "data", "economic_survey", "ilibrary", "chart"]

def convert(infile, json_filename, ttl_filename):
    r = csv.reader(open(infile))
    h = next(r)

    def make(c):
        return dict(zip(headings, c))

    cs = list(map(make, r))

    d = {
        "root": make(h),
        "countries": cs,
    }

    with open(json_filename, "w") as out_json:
        json.dump(d, out_json, indent=2)

    with open(ttl_filename, "w") as out:
        out.write("""@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
    @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
    @prefix owl: <http://www.w3.org/2002/07/owl#> .
    @prefix skos: <http://www.w3.org/2004/02/skos/core#> .
    @base <http://oecd.org/ns/> .

    """)
        for c in cs:
            out.write("""<%(iso)s>  rdf:type skos:Concept,
            skos:prefLabel "%(name)s".

    """ % c)

if __name__ == '__main__':
    convert(sys.argv[1], sys.argv[2], sys.argv[3])
