import sys
import os.path
import json
import xml.etree.ElementTree as ET
from xml.etree.ElementTree import Element, SubElement
import click
from itertools import chain, groupby

def find_headings(infile):
    xml = ET.fromstring(infile.read())
    headings = [get_concepts(h) for h in
                xml.iter("{http://www.oecd.org/ns/narr-doc}mainhead")]
    return [h for h in headings if h["annotations"]]

def get_concepts(mainhead):
    annos = [{
        "concept_name": el.get("concept-name") or el.text,
        "concept_id": el.get("concept-id"),
        "annotation_id": el.get("annotation_id"),
    } for el in mainhead.iter("{http://67bricks.com/annotation/}annotation")]

    return {
        "heading": "".join(mainhead.itertext()),
        "id": mainhead.get("id"),
        "annotations": annos,
    }

def merge_headings(inputs):
    headings = [{
        "filename": os.path.splitext(os.path.basename(input.name))[0],
        "headings": find_headings(input),
    } for input in inputs]
    return group_by_name(headings_by_name(headings))

def headings_by_name(file_headings):
    pairs = [[[(anno["concept_id"], anno["concept_name"], heading, file_heading["filename"])
               for anno in heading["annotations"]]
              for heading in file_heading["headings"]]
             for file_heading in file_headings]

    def fmt(concept_id, concept_name, heading, filename):
        return (concept_id, concept_name, {
            "id": heading["id"],
            "heading": heading["heading"],
            "filename": filename,
        })
    return [fmt(*p) for p in chain(*map(chain, *pairs))]

def group_by_name(concept_name_headings):
    def fmt(group):
        return {
            "concept_id": group[0][0],
            "concept_name": group[0][1],
            "headings": [item[2] for item in group],
        }
    cid = lambda c: c[0]
    return [fmt(list(group)) for (concept_id, group) in
            groupby(sorted(concept_name_headings, key=cid), cid)]

@click.command()
@click.argument('input', type=click.File('r'))
@click.argument('output', type=click.File('w'))
def toc_concepts_one(input, output):
    """
    Gets the headings with annotations from an annotated document XML.
    """
    toc = find_headings(input)
    json.dump(toc, output, indent=2)

@click.command()
@click.option('--output', type=click.File('w'), default=sys.stdout, metavar="FILENAME.json")
@click.argument('inputs', type=click.File('r'), nargs=-1, metavar="[INPUT.xml] ...")
def toc_concepts(output, inputs):
    """
    Gets all headings and annotations from annotated document XML
    files and outputs a json blob.
    """
    toc = merge_headings(inputs)
    json.dump(toc, output, indent=2)

if __name__ == '__main__':
    toc_concepts()
