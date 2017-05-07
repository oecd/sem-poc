import csv
import json
import sys
import re
import click

from terms import get_definitions

@click.command()
@click.option('--prefix', help="id prefix", default="")
@click.argument("input", type=click.File("r"))
@click.argument("output", type=click.File("w"))
def make_skos(prefix, input, output):
    output.write("""@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@base <http://oecd.org/ns/> .
""")

    for entry in get_definitions(input):
        entry["prefix"] = prefix
        output.write("""
<%(prefix)s%(Agora id)s>  rdf:type skos:Concept ;
""" % entry)
        if entry.get("abbrev"):
            output.write("""        skos:altLabel "%(abbrev)s" ;""" % entry)
        output.write("""        skos:prefLabel "%(term)s" .
    """ % entry)

if __name__ == "__main__":
    make_skos()
