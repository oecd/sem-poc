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
def make_html(prefix, input, output):
    output.write("""
<html>
<head>
    <title>Definitions</title>
<!--
<style>
.term-source {
  margin-top: 0.5em;
  border: 1px solid #888;
  color: #444;
}

.term-expert-definition {
  border: 1px solid #400;
  background-color: #fee;
  border-radius: 8px;
  padding: 4px;
}

.term-simple-definition {
  border: 1px solid #004;
  background-color: #eef;
  border-radius: 8px;
  padding: 4px;
}
</style>
-->
</head>
<body>
""")

    for entry in get_definitions(input):
        entry["prefix"] = prefix
        output.write("""
<div class="term" concept-id="%(prefix)s%(Agora id)s" id="term-%(prefix)s%(Agora id)s">
  <h3 class="term-name">%(English Term)s</h3>
""" % entry)
        if entry.get("definition"):
            output.write("""<div class="term-expert-definition">%(definition)s</div>\n""" % entry)

        term_link = lookup_term_link(entry["English Term"])
        if term_link:
            output.write("""<div class="term-link"><a href="%s">%s</a></div>\n""" % term_link)

        if entry.get("source"):
            output.write("""<div class="term-source">%(source)s</div>\n""" % entry)

        if entry.get("English Simple definition"):
            output.write("""
  <div class="term-simple-definition">
%(English Simple definition)s
  </div>
            """ % entry)

        output.write("""</div>\n""")

    output.write("""
</body>
</html>
""")

def lookup_term_link(term_name):
    special_terms = [
        (r"productivity", "http://www.oecd-ilibrary.org/employment/data/oecd-productivity-statistics_pdtvy-data-en", "OECD Productivity Statistics"),
        (r"social welfare", "http://www.oecd-ilibrary.org/social-issues-migration-health/data/oecd-social-and-welfare-statistics_socwel-data-en", "OECD Social and Welfare Statistics"),
        (r"globalisation", "http://www.oecd-ilibrary.org/finance-and-investment/data/oecd-statistics-on-measuring-globalisation_global-data-en", "OECD Statistics on Measuring Globalisation"),
        (r"current taxes on.*", "http://www.oecd-ilibrary.org/taxation/data/oecd-tax-statistics_tax-data-en", "OECD Tax Statistics"),
    ]
    for exp, link, title in special_terms:
        if re.match(exp, term_name, re.I):
            return link, title
    return None

if __name__ == "__main__":
    make_html()
