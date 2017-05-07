import json
import os.path
import sys
import re
from collections import OrderedDict

from luxid2json import load_keywords

def load_files(base, filenames):
    for filename in filenames:
        with open(filename) as f:
            kw = load_keywords(f)
            yield (get_issue(base, filename), kw)

def get_issue(base, filename):
    start = "Report-%s-" % base
    end = ".xml"
    return os.path.basename(filename)[len(start):-len(end)]

def make_keywords(files):
    values = OrderedDict()
    uris = {}
    types = {}
    for issue, keywords in files:
        for kw in get_keyword(issue, keywords):
            uris[kw["name"]] = kw["uri"]
            types[kw["name"]] = kw["type"]
            values.setdefault(kw["name"], []).append(kw["value"])
    return [{
        "name": name,
        "uri": uris[name],
        "values": value,
        "type": types[name],
    } for (name, value) in values.items()]

def get_keyword(issue, keywords):
    return [{
        "name": kw["name"],
        "uri": kw["uri"],
        "type": kw["type"],
        "value": {
            "issue": issue,
            "zScore": kw["zScore"],
            "score": kw["score"],
        },
    } for kw in keywords]

def main():
    base = sys.argv[1]
    infilenames = sys.argv[2:]

    files = list(load_files(base, infilenames))

    output = {
        "base": base,
        "issues": [issue for (issue, _) in files],
        "keywords": make_keywords(files),
    }

    json.dump(output, sys.stdout, indent=2)

if __name__ == '__main__':
    main()
