import csv
import re

def get_definitions(f):
    for entry in csv.DictReader(f):
        (expert, source1) = parse_definition_source(entry["English Expert definition"])
        (simple, source2) = parse_definition_source(entry["English Simple definition"])
        (entry["term"], entry["abbrev"]) = parse_definition_label(entry["English Term"])
        entry["definition"] = expert or simple
        entry["source"] = source1 or source2
        yield entry

def parse_definition_source(text):
    m = re.match(r"(.*?)(?:<br ?/>|<p>|<em>)?(?:\[(.*?)\])?(?:</em>)?(?:</p>)?$", text)
    return (m.group(1), m.group(2)) if m else (text, None)

def parse_definition_label(text):
    return (text, None)
