/// <reference path="./typings/jquery/index.d.ts"/>
/// <reference path="./typings/lodash/index.d.ts"/>
/// <reference path="./typings/chart.js/index.d.ts"/>
/// <reference path="./typings/moment.d.ts"/>
/// <reference path="./typings/bootstrap.d.ts"/>
/// <reference path="./typings/vue/index.d.ts"/>

var terms;
var countries: Countries = null;

function fetchAnnotations() {
  terms = $('<div id="terms"></div>').hide().appendTo("body");
  return $.ajax({
    url: "terms.html",
    success: function(response) {
      $(response).find("style").remove().end().appendTo(terms);
      return terms;
    }
  });
}

function fetchCountries(): JQueryPromise<Countries> {
  return $.getJSON("countries.json").then(function(response: Countries) {
    countries = {
      root: response.root,
      countries: response.countries,
      iso: _.keyBy(response.countries, "iso")
    };
    return countries;
  });
}

function fetchPublications(): JQueryPromise<Publications> {
  return $.getJSON("publications.json")
    .then((response: Publications) => response, err => {
      console.error("fetching publications", err);
    });
}

function splitFilename(filename: string, publications?: Publications) {
  const parts = filename.split("-");
  return {
    publication: publications ? publications[parts[0]] : undefined,
    publicationName: parts[0],
    issue: parts.slice(1).join("-"),
    issueYear: parts[1].replace(/v/, "")
  };
}

interface TOCConcepts {
  byName: {
    [index: string]: TOCConcept;
  };
  byId: {
    [index: string]: TOCConcept;
  };
};

interface TOCConcept {
  concept_name: string;
  concept_id: string;
  headings: {
    filename: string;
    id: string;
    heading: string;
  }[];
};

function fetchTOCConcepts(): JQueryPromise<TOCConcepts> {
  return $.getJSON("toc-concepts.json")
    .then((response: TOCConcept[]) => {
      _.each(response, concept => {
        concept.headings.sort((a, b) => {
          // sort by issue date descending then publication
          const ia = splitFilename(a.filename);
          const ib = splitFilename(b.filename);
          var issue = -ia.issueYear.localeCompare(ib.issueYear);
          var pub = ia.publicationName.localeCompare(ib.publicationName);
          return issue === 0 ? pub : issue;
        });
      });
      return {
        byName: _.keyBy(response, "concept_name"),
        byId: _.keyBy(response, "concept_id"),
      };
    });
}

function issueUrl(publication: string, issue: string): string {
  return `${publication}-${issue}.html`;
}

function fetchTitle(conceptId) {
  var country = countries.iso[conceptId];
  if (country) {
    return country.name;
  } else if (terms) {
    return findTerm(conceptId).find(".term-name").text();
  }
}

function fetchAnnotation(conceptId, elemId) {
  if (countries.iso[conceptId]) {
    return fetchAnnotationCountry(conceptId, elemId);
  } else {
    return fetchAnnotationAgora(conceptId, elemId);
  }
}

function findTerm(conceptId) {
  if (terms) {
    return terms.find(".term[concept-id='" + conceptId + "']");
  } else {
    return $([]);
  }
}

function fetchAnnotationAgora(conceptId, elemId) {
  if (terms) {
    var term = findTerm(conceptId).clone().show();
    return $("#" + elemId).empty()
      .append(term.find(".term-expert-definition"))
      //.append(term.find(".term-simple-definition"))
      .append(term.find(".term-link").find("a").attr("target", "_blank").end())
      .append(term.find(".term-source"));
  }
}

// https://css-tricks.com/snippets/jquery/make-jquery-contains-case-insensitive/
$.expr[":"].icontains = $.expr.createPseudo(function(arg) {
  return function( elem ) {
    return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
  };
});

$.expr[":"].special = $.expr.createPseudo(arg => {
  return elem => {
    let text = $(elem).text().trim();
    return text.slice(0, arg.length) !== arg && text.slice(-arg.length) === arg;
  };
});


function fetchAnnotationCountry(iso, elemId) {
  let country = countries.iso[iso];

  let chartUrl = countries.root.chart + (country.chart || "4NIq");

  let elem = $("#" + elemId).empty()
    .append(`<iframe class="gdp-chart" src="${chartUrl}" mozallowfullscreen="true" webkitallowfullscreen="true" allowfullscreen="true"><a class="btn btn-default" href="${chartUrl}" target="_blank">GDP Chart</a></iframe>`);

  let sections = $(`div.mainhead:icontains('${country.name}')`);

  let sectionButtons = sections.map((index, el) => {
    let sectionId = $(el).attr("id");
    let text = $(el).text().toLocaleLowerCase() === country.name.toLocaleLowerCase()
      ? `<i class="fa fa-hand-o-right" aria-hidden="true"></i> View ${country.name} section`
      : $(el).text().trim();

    // merge "deflation risks have faded ... in the united kingdom" type headings
    if (text[0] === '…' || text.slice(0, 3) === "...") {
      const before = $(el).parents("section")
        .prevAll("section")
        .filter((n, el) => !!$(el).find(".mainhead:special('…')")[0])
        .first()
        .find(".mainhead");
      if (before) {
        text = before.text().trim() + " " + text.slice(1);
      }
    }

    return $(`<div class="country-popover-button"><a class="btn btn-block btn-outline-info" href="#${sectionId}">${text}</a></div>`)[0];
  });

  sectionButtons.appendTo(elem);

  return elem.append(
    $(`<div class="links"></div>`)
      .append(`<a class="btn btn-sm btn-primary" href="${countries.root.data}${country.data}">
               <i class="fa fa-line-chart" aria-hidden="true"></i> Country Data</a>`)
      .append(`<a class="btn btn-sm btn-primary" href="${countries.root.economic_survey}${country.economic_survey}">Economic Survey</a>`)
      .append(`<a class="btn btn-sm btn-primary" href="${countries.root.ilibrary}${country.ilibrary}">
<i class="fa fa-search" aria-hidden="true"></i> Search</a>`));
}

function dismissAllPopovers() {
  $('[data-original-title]').popover('dispose');
}

function setupAnnotations() {
  $("span.line-annotation").on("click", function(ev) {
    var $self = $(this);
    dismissAllPopovers();
    var conceptId = $self.attr("concept-id");

    if (conceptId) {
      var divId =  "tmp-id-" + $.now();
      var div = $('<div id="' + divId + '">Loading...</div>').hide().appendTo("body");
      fetchAnnotation(conceptId, divId);

      var title = fetchTitle(conceptId);

      var p = $self.popover({
        html: true,
        placement: "bottom",
        trigger: "manual", // avoids problem with multiple nested annotations
        title: title,
        content: div.html()
      }).popover("show");
    }

    div.remove();
    return false;
  });

  // Dismiss all popovers when clicking outside with this code:

  $('html').on('click', function(e) {
    if (typeof $(e.target).data('original-title') == 'undefined') {
      dismissAllPopovers();
    }
  });
}

interface Publications {
  [index: string]: Publication;
}

interface Publication {
  title: string;
  short_title: string;
  issues: string[];
  volumes: {
    name: string;
    issues?: {
      name: string;
      key: string;
    }[];
    key?: string;
  },
  covers: {
    [index: string]: string;
  }
};

interface Country {
  stat: string;
  iso: string;
  data: string;
  name: string;
  bli: string;
  oecd: string;
  economic_survey: string;
  ilibrary: string;
  chart: string;
}

interface Countries {
  root: Country;
  countries: Country[];
  iso: {}
}

interface Keyword {
  name: string;
  uri: string;
  type: "coverage"|"subject";
  values: {
    score: string;
    zScore: string;
    issue: string;
  };
}

interface Keywords {
  base: string;
  issues: string[];
  keywords: Keyword[];       // all keywords
  coverage?: Keyword[];      // keywords with type coverage
  subject?: Keyword[];       // keywords with type subject
  countries?: Keyword[];     // country keywords
  countryGroups?: Keyword[]; // geographic area keywords
}

interface IssueKeyword {
  type: "coverage"|"subject";
  score: string;
  zScore: string;
  name: string;
  uri: string;
}

function getKeywords(dataset: string, countries: JQueryPromise<Countries>): JQueryPromise<Keywords> {
  return countries.then(countries => {
    const countryNames = _.map(countries.countries, "name");
    const countryGroupNames = [
      "Asia", "Continental Europe", "Europe", "European Union",
      "Central and Eastern Europe",
      "OECD area", "Euro area"
    ];
    const isGroup = kw => _.includes(countryGroupNames, kw.name) ||
      kw.name.indexOf("countries") >= 0;
    const isNotCountry = kw => !_.includes(countryNames, kw.name);

    return $.getJSON("keywords/" + dataset + ".json", (response: Keywords) => {
      response.keywords = _.sortBy(response.keywords, "name");
      [response.coverage, response.subject] = _.partition(response.keywords, { type: "coverage" });
      [response.countryGroups, response.countries] = _.partition(response.coverage, isGroup);
      return response;
    });
  });
}

function chartColours(n: number) {
  const Helpers = (<any>Chart).helpers;
  const baseColours = [
    // "#4D4D4D", // gray
    "#5DA5DA", // blue
    "#FAA43A", // orange
    "#60BD68", // green
    "#F17CB0", // pink
    "#B2912F", // brown
    "#B276B2", // purple
    "#DECF3F", // yellow
    "#F15854"  // red
  ];

  var divs = Math.ceil(n / baseColours.length);

  return _.range(0, n).map(index => {
    var cycle = Math.floor(index / baseColours.length)
    var shift = Math.floor(cycle * 100 / divs);
    var c = Helpers.color(baseColours[index % baseColours.length])
    c.hue(c.hue() + shift);
    return c;
  }).valueOf();
}

interface Styles { [index: string]: any; }

function timelineStyles(data: Keywords): Styles {
  const index = { coverage: 0, subject: 0 };
  const colours = _.mapValues(index, (_, t) => chartColours(data[t].length))

  return _(data.keywords).map(kw => {
    const c = colours[kw.type][index[kw.type]++];
    return [kw.name, {
      backgroundColor: c.alpha(0.4).rgbString(),
      borderColor: c.alpha(1).rgbString(),
      pointBorderColor: c.rgbString(),
      pointHoverBackgroundColor: c.rgbString(),
      borderDash: kw.type === "coverage" ? [] : [2, 2]
    }];
  }).fromPairs().valueOf();
}

interface Words {
  [index: string]: number;
}

function shortenTermName(name: string): string {
  const dontShorten = ["investment", "inflation"];
  const acronym = name.match(/(.*?)\s+\(([A-Z&\.0-9]+)\)/);
  if (_.some(dontShorten, d => _.startsWith(name, d))) {
    // choose non-abbreviated term name
    return acronym ? acronym[1] : name;
  } else {
    // choose abbreviated term name
    return acronym ? acronym[2] : name;
  }
}

function termDefinitionHtml(term: JQuery) {
  return "<div>" + term.find(".term-expert-definition").html() +
    (term.find(".term-link").html() || "") + "</div>";
}

function findConceptId(name: string, terms: JQuery) {
  const term = terms.find(`.term-name:contains('${name}')`).parent();
  const conceptId = term.attr("concept-id");
  if (conceptId) {
    return {
      conceptId: conceptId,
      definitionHtml: termDefinitionHtml(term)
    };
  } else {
    return {};
  }
}

function getDocumentName(): string {
  const m = document.location.pathname.match(/.*\/([^.]+).html$/);
  return m ? m[1] : "";
}

function setupFootnotes() {
  $(function() {
    $("a.fnote")
      .popover({
        trigger: "manual",
        html: true,
        content: function() {
          return $(this).find(".content").html();
        },
        container: "body"
      })
      .click(function(evt) {
        evt.preventDefault();
        evt.stopPropagation();
        $(this).popover("show");
      })
      .blur(function(evt) {
        $(this).popover("hide");
      });
  });
}

interface Tag {
  conceptId: string;
  word: string;
  name: string;
  definitionHtml?: string;
  weight: number;
}

interface TagMap {
  [index: string]: Tag;
}

function documentMain(publication: string, selector: string) {
  const countriesPromise = fetchCountries();
  const annoPromise = fetchAnnotations();
  const issueKeywordsPromise = $.getJSON(`temis/${getDocumentName()}.json`);

  setupFootnotes();

  let annotations = null;
  annoPromise.then(terms => { annotations = terms; });

  Vue.component("e-tag-cloud", {
    props: ["source", "highlight"],
    data() {
      return {
        selection: {},
        tags: {},
        highlight: []
      };
    },
    mounted() {
      this.setupTags().then((tags: Tag[]) => {
        this.tags = _.keyBy(tags, t => t.conceptId);

        // convert to jqcloud format
        this.cloud = _.map(tags, tag => {
          return {
            text: tag.word,
            html: {
              "data-concept-id": tag.conceptId,
              "title": tag.name,
              "data-content": tag.definitionHtml
            },
            weight: tag.weight
          };
        });

        $(this.$el)
          .jQCloud(this.cloud, {
            //shape: "rectangular", // or "elliptic"
            delay: 0,
            autoResize: true
          })
          .popover({
            selector: ".jqcloud-word[data-content]",
            html: true,
            trigger: "hover",
            placement: "bottom",
            delay: { show: 250, hide: 250 }
          })
          .on("click", ".jqcloud-word", evt => {
            const conceptId = $(evt.target).attr("data-concept-id");
            const word = $(evt.target).text();
            this.toggleWord(conceptId, word);
            evt.preventDefault();
            evt.stopPropagation();
          })
          .on("mouseenter mouseleave", ".jqcloud-word", evt => {
            const conceptId = $(evt.target).attr("data-concept-id");
            this.$emit("hover", conceptId, evt.type === "mouseenter");
          });
      });
    },
    beforeDestroy() {
      $(this.$el);
        .jQCloud("destroy")
        .popover("destroy")
        .off();
    },
    methods: {
      kick() {
        window.setTimeout(() => {
          // trigger jQCloud repositioning
          $(this.$el).resize();
        }, 0);
      },
      setupTags(): JQueryPromise<Tag[]> {
        const temisTags: (type: string) => JQueryPromise<Tag[]> = type => {
          return issueKeywordsPromise.then((keywords: IssueKeyword[]) => {
            return _(keywords)
              .filter({ type })
              .sortBy(kw => -kw.zScore)
              .map(keyword => {
                return {
                  name: keyword.name,
                  word: keyword.name,
                  weight: keyword.zScore
                };
              })
              .valueOf();
          });
        };

        const setup = {
          agora() {
            const tagBlacklist = {"OECD": true, "prices": true};
            const url = `cloud/${getDocumentName()}.json`;
            return annoPromise.then(terms => $.getJSON(url).then((words: Words) => {
              return _(words).keys()
                .sortBy(conceptId => -words[conceptId])
                .take(100)
                .map(conceptId => {
                  const term = findTerm(conceptId);
                  const name = term.find(".term-name").text();
                  return {
                    name: name,
                    word: shortenTermName(name),
                    conceptId: conceptId,
                    definitionHtml: termDefinitionHtml(term),
                    weight: words[conceptId]
                  };
                })
                .filter(t => !tagBlacklist[t.word])
                .uniqBy(t => t.word)
                .valueOf();
            }));
          },
          coverage() {
            return temisTags("coverage").then(
              (keywords: Tag[]) =>
                countriesPromise.then(countries => {
                  const isos = _.mapValues(_.invertBy(countries.iso, "name"), _.head);
                  return _.map(keywords, kw => _.assign(kw, { conceptId: isos[kw.name] }));
                }));
          },
          countries() {
            return this.coverage().then(
              (keywords: Tag[]) =>
                countriesPromise.then(countries => {
                  return _.filter(keywords, (tag: Tag) => !!countries.iso[tag.conceptId]);
                }));
          },
          subject() {
            return temisTags("subject").then(
              (keywords: Tag[]) =>
                annoPromise.then(
                  terms => _(keywords).map(kw => {
                    _.assign(kw, findConceptId(kw.name, $(terms)));
                    return kw;
                  }).take(100).valueOf()));
          }
        };

        return setup[this.source]();
      },
      toggleWord(conceptId: string, word: string) {
        if (conceptId) {
          this.selection[conceptId] = !this.selection[conceptId];

          // highlight word in tag cloud
          $(this.$el).find(`.jqcloud-word[data-concept-id='${conceptId}']`)
            .toggleClass("selected", this.selection[conceptId]);

          const tags: Tag[] = _(this.selection)
            .map((sel, conceptId) => sel ? this.tags[conceptId] : null)
            .filter().valueOf();

          this.$emit("selectionchanged", tags);
        }
      }
    },
    watch: {
      highlight: {
        handler(conceptIds: ConceptCount) {
          const max = _.max(_.values(conceptIds));
          $(this.$el).find(".jqcloud-word[data-concept-id]")
            .each((index, elem) => {
              const count = conceptIds[$(elem).attr("data-concept-id")];
              $(elem)
                .toggleClass("highlighted", !!count)
                .css("opacity", count ? 0.5 + count / (2 * max) : 1.0);
            });
        },
        deep: true
      }
    },
    template: `<div class="tag-cloud"></div>`
  });

  Vue.component("e-toc-filters", {
    props: ["selection"],
    template: `<div class="toc-filters">
      <span class="toc-filter"
            v-for="tag in selection"
            @click="$emit('remove', tag)">
        {{ tag.word }}
      </span>
    </div>`
  });

  interface Coverage {
    // ID -> conceptId -> count
    [index: string]: ConceptCount
  }
  interface ConceptCount {
    [index: string]: number;
  }

  interface ReverseCoverage {
    // ID -> [conceptId]
    [index: string]: string[];
  }

  Vue.component("e-toc", {
    props: ["selection", "highlight"],
    mounted() {
      $(this.$el).on("mouseenter mouseleave", "a", evt => {
        const item = $(evt.target);
        this.onHover(item.attr("href").slice(1), evt.type === "mouseenter");
      });

      // this may be slow, could be better to do it offline
      const buildCoverage: ($el: JQuery) => Coverage = $el => {
        let coverage: Coverage = {};
        $el.find("li a").each((index, el) => {
          const target = $(el).attr("href");
          if (target) {
            const id = target.slice(1);
            coverage[id] = _(
              $(`a[name='${id}']`)
                .next()
                .find("span.line-annotation[concept-id]")
                .map((index, span) => $(span).attr("concept-id")))
              .countBy()
              .mergeWith(coverage[id], (a, b) => a + b)
              .valueOf();
          }
        });
        return coverage;
      };
      const buildReverseCoverage: (coverage: Coverage) => ReverseCoverage =
        coverage => _(coverage)
          .mapValues(_.keys)
          .map((cs, id) => _.map(cs, c => [c, id]))
          .flatten()
          .groupBy(p => p[0])
          .mapValues(vs => _.map(vs, p => p[1]))
          .valueOf();

      this.coverage = buildCoverage($(this.$el));
      this.reverseCoverage = buildReverseCoverage(this.coverage);
    },
    methods: {
      onHover(id: string, over: boolean) {
        const conceptIds = this.coverage[id];
        if (conceptIds) {
          this.$emit("hover", conceptIds, over);
        }
      },
      eachTocHeading(callback) {
        return $(this.$el).find("li")
          .each((index, el) => {
            const target = $(el).find("a").attr("href");
            if (target) {
              callback(target.slice(1), $(el));
            }
          });
      }
    },
    watch: {
      selection: {
        handler(sel: Tag[]) {
          const selConceptIds = _.map(sel, s => s.conceptId);

          // filter toc items with jquery
          $(this.$el).find("li")
            .each((index, el) => {
              const target = $(el).find("a").attr("href");
              if (target) {
                const id = target.slice(1);
                const match = _.every(selConceptIds, conceptId => this.coverage[id][conceptId]);
                $(el).toggle(!sel.length || match);
              }
            });
        },
        deep: true
      },
      highlight(conceptId: string) {
        this.eachTocHeading((id, $el) => {
          const count = this.coverage[id][conceptId];
          $el.toggleClass("highlighted", !!conceptId && !!count);
        });
      }
    },
    template: `<div><slot></slot></div>`
  });

  Vue.component("e-cloud-select", {
    properties: ["value"],
    data() {
      return {
        value: "agora",
        sources: [{
          name: "agora",
          text: "Glossary Terms"
        }, {
          name: "subject",
          text: "Subjects"
        }, {
          "items": [{
            name: "countries",
            text: "Countries"
          }, {
            name: "coverage",
            text: "+ Areas"
          }]
        }]
      };
    },
    methods: {
      select(source) {
        this.value = source.name;
        this.$emit("input", source.name);
      }
    },
    template: (() => {
      const btn = cls => `
        <button class="btn btn-sm ${cls}"
                :class="{ 'btn-outline-info': value !== cloud.name, 'btn-info': value === cloud.name }"
                @click="select(cloud)">
          {{ cloud.text }}
        </button>
      `;
      return `
        <div class="row justify-content-end cloud-selector">
          <div class="col">
            <template v-for="cloud in sources">
              <template v-if="cloud.name">
              ${btn("btn-block")}
              </template>
              <template v-else>
                <template v-for="cloud in cloud.items">
                ${btn("coverage")}
                </template>
              </template>
            </template>
          </div>
        </div>
      `;
    })()
  });

  const app = new Vue({
    data: {
      publication,
      issue: getDocumentName(),
      tagSelection: {},
      cloudSource: "agora",
      highlightTagCloudConcepts: [],
      highlightTocConcept: ""
    },
    methods: {
      tagSelectionChanged(sel) {
        this.tagSelection = sel;
      },
      onTocHover(conceptIds: ConceptCount, over: boolean) {
        this.highlightTagCloudConcepts = over ? conceptIds : [];
      },
      onTagCloudHover(conceptId: string, over: boolean) {
        this.highlightTocConcept = over ? conceptId : "";
      },
      onRemoveTag(tag: Tag) {
        this.$refs.cloud_agora.toggleWord(tag.conceptId, tag.word);
      }
    },
    watch: {
      cloudSource(source) {
        this.$refs[`cloud_${source}`].kick();
      }
    },
    mounted: function () {
      setupAnnotations();
    }
  }).$mount(selector);
}

function publicationMain(publication: string, selector: string) {
  let pubInfo: Publication = null;
  const countriesPromise = fetchCountries();
  const pubsPromise = fetchPublications();
  const metaPromise = pubsPromise.then(pubs => { return pubInfo = pubs[publication]; });
  const keywordsPromise = getKeywords(publication, countriesPromise);
  const conceptsPromise = fetchTOCConcepts();

  Vue.component("e-timeline", {
    props: ["dataset"],
    template: `
      <div class="row" v-if="keywords">
        <div class="col-2 chart-type-select" ref="buttons">
          <div>
          <e-chart-keywords :items="keywords.countries" type="coverage"
                            :active="which"
                            @activate="select('coverage')"
                            v-model="countrySel">
            Country
          </e-chart-keywords>
          <e-chart-keywords :items="keywords.subject" type="subject"
                            :active="which"
                            @activate="select('subject')"
                            v-model="subjectSel">
            Subject
          </e-chart-keywords>
          </div>
          <e-chart-legend v-if="false"
              :items="which === 'coverage' ? countrySel : subjectSel"
              :styles="styles">
          </e-chart-legend>
        </div>
        <div class="col">
          <div v-if="false">
            <e-timeline-lines v-if="false" :keywords="keywords" :country-sel="countrySel">
            </e-timeline-lines>
          </div>
          <div v-else>
            <div v-show="which === 'coverage'">
            <e-timeline-bubbles :styles="styles"
                                :keywords="keywords.countries"
                                :issues="keywords.issues"
                                :sel="countrySel"
                                @click-issue="issueClicked">
            </e-timeline-bubbles>
            </div>
            <div v-show="which !== 'coverage'">
            <e-timeline-bubbles :styles="styles"
                                :keywords="keywords.subject"
                                :issues="keywords.issues"
                                :sel="subjectSel"
                                @click-issue="issueClicked">
            </e-timeline-bubbles>
            </div>
          </div>
        </div>
      </div>
    `,
    data() {
      return {
        which: "coverage",
        countrySel: ["China", "Russian Federation", "United States"], // fixme: load from cookie
        subjectSel: ["gross domestic product", "inflation", "productivity"], // fixme: cookie/localstorage
        styles: {},
        keywords: null,
        legend: []
      };
    },
    methods: {
      issueClicked(issue: string, label: string) {
        this.$emit("click-issue", issue, label, this.which === "coverage" ? "country": "subject");
      },
      select(which: string) {
        this.which = which;
        this.$emit("which-select", which);
      }
    },
    mounted() {
      const ctx = $(this.$el).find("canvas");
      keywordsPromise.then(response => {
        this.keywords = response;
        this.legend = _.map(this.keywords.keywords, "name");
        this.styles = timelineStyles(this.keywords);
      });
    }
  });

  Vue.component("e-chart-keywords", {
    props: ["type", "items", "value", "active"],
    data() {
      return {
        sel: this.getSel(this.value)
      };
    },
    template: `
      <span>
        <button class="btn btn-sm"
                 :class="{ 'btn-primary': type === active, 'btn-secondary': type !== active }"
                 @click="show()">
          <slot>Keywords</slot>
        </button>

        <div class="modal fade" ref="dlg">
          <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Select {{ type }}</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
<div class="row">
<div class="form-check col-3" v-for="item in items">
  <label class="form-check-label">
    <input class="form-check-input" type="checkbox"
           :checked="sel[item.name]"
           :value="item.name"
           @click="selected(item.name, $event.target.value)">
    {{ item.name }}
  </label>
</div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-primary" @click="hideModal()">Close</button>
                <!--<button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>-->
              </div>
            </div>
          </div>
        </div>
      </span>
    `,
    watch: {
      value(val) {
        this.sel = this.getSel(val);
      }
    },
    mounted() {
      // bootstrap modals like to be there
      $(this.$refs.dlg).appendTo("body");
    },
    methods: {
      show() {
        $(this.$refs.dlg).modal();
        this.$emit("activate", this.type);
      },
      hideModal() {
        $(this.$refs.dlg).modal("hide");
      },
      selected(keyword: string, val: boolean) {
        this.sel[keyword] = !this.sel[keyword];
        this.$emit("input", this.getSelectedItems());
      },
      getSelectedItems() {
        return _(this.items)
          .filter(item => this.sel[item.name])
          .map("name")
          .valueOf();
      },
      getSel(value) {
        return _(value).map(name => [name, true]).fromPairs().valueOf();
      }
    }
  });

  Vue.component("e-chart-legend", {
    props: ["items", "styles"],
    template: `
      <ul class="legend">
      <li v-for="item in items" class="colour"
          :style="style(item)" @click="click(item, $event)">{{ item }}</li>
      </ul>
    `,
    methods: {
      style(name: string) {
        return {
          "background-color": this.styles[name].backgroundColor,
          "border-color": this.styles[name].borderColor
        };
       //.toggleClass("active", kw.name === initialCountry)
      },
      click(name: string, evt) {
        /*
        var dataset = _.find(chart.data.datasets, { label: kw.name });
        if (dataset) {
          dataset["hidden"] = !dataset["hidden"];
          $(evt.target).toggleClass("active", !dataset["hidden"]);
          chart.update();
        }
        */
      }
    }
  });

  Vue.component("e-timeline-lines", {
    props: ["keywords", "countrySel"],
    data() {
      return {};
    },
    template: `<canvas width="400" height="150"></canvas>`,
    mounted() {
      function timelineSetupLineChart(ctx: JQuery, response: Keywords, initialCountry: string) {
        const styles = timelineStyles(response);
        const minScore = _(response.keywords).map(item => _.map(item.values, "zScore")).flatten().min();

        var data = timelineLineChartData(response, initialCountry, styles);
        var chart = timelineLineChart(ctx, data);

        ctx.on("click", function(evt) {
          var el = <any>chart.getElementAtEvent(evt);
          if (el && el.length) {
            var pt = el[0];
            var issue = response.issues[pt._index];
            if (issue) {
              var url = response.base + "-" + issue + ".html";
              window.location.href = url;
            }
          }
        });
      }

      function timelineLineChartData(response: Keywords, initialCountry: string, styles: Styles) {
        return {
          labels: response.issues,
          datasets: _.map(response.keywords, (kw: Keyword, index: number) => {
            var issues = _.keyBy(kw.values, "issue");
            return _.assign({
              hidden: kw.name !== initialCountry,
              label: kw.name,
              fill: false,
              lineTension: 0.1,
              borderCapStyle: 'butt',
              borderDashOffset: 0.0,
              borderJoinStyle: 'miter',
              pointBackgroundColor: "#fff",
              pointBorderWidth: 1,
              pointHoverRadius: 5,
              pointHoverBorderColor: "rgba(220,220,220,1)",
              pointHoverBorderWidth: 2,
              pointRadius: 1,
              pointHitRadius: 10,
              data: _.map(response.issues, name => issues[name] ? issues[name]["zScore"] : -1.0),
              spanGaps: false,
            }, styles[kw.name]);
          })
        };
      }

      function timelineLineChart(ctx: HTMLCanvasElement, data) {
        return new Chart(ctx, {
          type: 'line',
          data: data,
          options: {
            scales: {
              yAxes: [{
                ticks: <Chart.LinearTickOptions>{
                  display: false,
                  beginAtZero: true
                },
                scaleLabel: {
                  display: true,
                  labelString: "Temis z-score"
                }
              }]
            },
            legend: {
              display: false,
              position: 'top'
            }
          }
        });
      }

      timelineSetupLineChart($(this.$el), this.keywords, this.countrySel ? this.countrySel[0] : null);
    }
  });

  Vue.component("e-timeline-bubbles", {
    props: ["keywords", "sel", "styles", "issues"],
    data() {
      return {};
    },
    template: `<canvas width="400" height="150"></canvas>`,
    mounted() {
      const ctx = $(this.$el);

      var data = {
        datasets: _.map(this.keywords, (kw: Keyword, index: number) => {
          const issues = _.keyBy(kw.values, "issue");
          return _.assign({
            hidden: false,
            label: kw.name,
            data: _(this.issues).map((name: string, x: number) => {
              return issues[name] ? {
                x: x + 1,
                y: this.keywords.length - index,
                r: issues[name]["zScore"],
                zScore: issues[name]["zScore"]
              } : null;
            }).filter().valueOf(),
            hoverRadius: 0.4
          }, this.styles[kw.name]);
        })
      }

      this.chart = new Chart(ctx, {
        type: 'bubble',
        data: data,
        options: {
          scales: {
            yAxes: [{
              ticks: <Chart.LinearTickOptions>{
                display: true,
                autoSkip: false,
                min: 0,
                stepSize: 1,
                maxTicks: 20, // fixme: check effect of this
                callback: (value, index, values) =>
                  value >= 1 ? this.sel[this.sel.length - value] : ""
              },
              gridLines: {
                // can remove horizontal grid lines but it looks a bit stupid
                display: true
              },
              scaleLabel: {
                display: false,
                labelString: "Country"
              },
              afterFit: function(scale) {
                // align y-axis of chart with bootstrap colum
                // the grid gutter width is 30px
                const column = $(".chart-type-select");
                if (column) {
                  scale.width = column.width() + 30;
                }
              }
            }],
            xAxes: [{
              ticks: <Chart.LinearTickOptions>{
                display: true,
                autoSkip: false,
                min: 0,
                max: this.issues.length + 1,
                stepSize: 1,
                maxTicks: 20, // fixme: check effect of this
                callback: (value, index, values) =>
                  value >= 1 ? this.issues[value - 1] : ""
              },
              scaleLabel: {
                display: false,
                labelString: "Issue of publication"
              }
            }]
          },
          tooltips: {
            callbacks: {
              title: items => this.issues[items[0].xLabel - 1],
              label: (item, data) => {
                var datasetLabel = data.datasets[item.datasetIndex].label || '';
		var dataPoint = data.datasets[item.datasetIndex].data[item.index];
		//return datasetLabel + ' (z-score: ' + dataPoint.zScore + ')';
                return datasetLabel;
              },
              footer: (items, data) => "Click bubble for more"
            }
          },
          legend: {
            display: false,
            position: "top"
          }
        }
      });

      this.updateVisibility(this.chart);

      const axisIndex = evt => {
        var eventPosition = Chart.helpers.getRelativePosition(evt, this.chart.chart);
        var mouseX = eventPosition.x;
        var mouseY = this.chart.chart.height - 16 - eventPosition.y;

        const scalePoints = scale => _.range(scale.min, scale.max + 1)
          .map(n => scale.getPixelForTick(n));

        /*
        console.log(`mouse (${mouseX}, ${mouseY})`);
        _.each(this.chart.scales, (scale, key) => {
          console.log(`scale ${key}`, scale);
          const points = scalePoints(scale);
          console.log(`points ${key}`, points);
        });
        */

        const scale = {
          x: this.chart.scales["x-axis-0"],
          y: this.chart.scales["y-axis-0"]
        };
        const points = _.mapValues(scale, scalePoints);

        const nearestIndex = (val: number, points: number[]) =>
          _.minBy(_.range(points.length), i => Math.abs(points[i] - val));

        if (mouseX < points.x[0] || mouseY < points.y[0]) {
          return {
            x: nearestIndex(mouseX, points.x),
            y: nearestIndex(mouseY, points.y)
          };
        }
        return null;
      };

      ctx.on("click", evt => {
        this.destroyPopover();
        var el = <any>this.chart.getElementAtEvent(evt);
        if (el && el.length) {
          const pt = el[0];
          const issues = _.map(this.keywords[pt._datasetIndex].values, "issue");
          const issue = issues[pt._index];
          const label = data.datasets[pt._datasetIndex].label;
          if (issue) {
            this.showPopover(pt._view.x, pt._view.y,
                             event.target.width, event.target.height,
                             issue, label);
            // this.$emit("click-issue", issue, label);
          }
        } else {
          const nearest = axisIndex(evt);
          if (nearest) {
            const issue = this.issues[nearest.x - 1];
            const label = this.sel[this.sel.length - nearest.y];
            this.$emit("click-issue",
                       nearest.y === 0 ? issue : "",
                       nearest.x === 0 ? label : "");
          }
        }
      });

      this.initPopover();
    },
    created() {
      const popover = {
        instance: null,
        call: (...args) => $(this.$el).popover.apply($(this.$el), args),
        title: () => pubInfo.title,
        content: "info"
      };
      this.initPopover = (opts) => {
        return popover.instance = popover.call(_.assign({
          trigger: "manual",
          title: () => popover.title,
          content: () => popover.content,
          html: true,
          placement: "right",
          container: "body"
        }, opts));
      };
      this.destroyPopover = () => {
        if (popover.instance) {
          popover.call("dispose");
          popover.instance = null;
        }
      };
      this.showPopover = (x: number, y: number, width: number, height: number, issue: string, topic: string) => {
        this.destroyPopover();

        popover.content = `<div class="chart-popover">
          <button class="btn btn-sm btn-block btn-outline-primary" data-what="issue">Issue ${issue} Table of Contents</button>
          <button class="btn btn-sm btn-block btn-outline-primary" data-what="topic">Sections about ${topic}</button>
        </div>`;

        const push = 6; // move it slightly to cover over tooltip
        // invert the bootstrap tethering and place popover at co-ordinate
        const tetherHack = x * 2 < width ?
          { offset: `${height / 2 - y}px ${width - x + push}px`, placement: "right" }
        : { offset: `${height / 2 - y}px ${-x - push}px`, placement: "left" };
        this.initPopover(tetherHack);
        popover.call("show");
        popover.content = $(".chart-popover")
          .on("click", "button", evt => {
            const what = $(evt.target).attr("data-what");
            if (what === "topic") {
              this.$emit("click-issue", "", topic);
            } else {
              this.$emit("click-issue", issue, "");
            }
            this.destroyPopover();
          });
      };
    },
    beforeDestroy() {
      this.destroyPopover();
    },
    methods: {
      updateVisibility(chart) {
        const sel = this.sel;
        const zScores = _(this.keywords)
          // .filter(kw => _.includes(sel, kw.name))
          .map(item => _.map(item.values, "zScore"))
          .flatten()
        const minScore = <number>zScores.min();
        const maxScore = <number>zScores.max();

        const size = 30;
        const normal = zScore => (zScore - minScore) / (maxScore - minScore);
        const radius = zScore => size * Math.sqrt(zScore);
        const offset = (score, prev) => (score - prev) * 0.33 / prev;

        _.each(chart.data.datasets, dataset => {
          const index = _.indexOf(sel, dataset.label);
          dataset["hidden"] = index < 0;
          var prevZ = normal(dataset.data[0].zScore);
          _.each(dataset.data, point => {
            const z = normal(point.zScore);
            point.y = sel.length - index + offset(z, prevZ);
            point.r = radius(z);
            prevZ = z;
          });
        });
        chart.options.scales.yAxes[0].ticks.max = sel.length + 1;
        chart.update();
      }
    },
    watch: {
      sel(val) {
        if (this.chart) {
          this.updateVisibility(this.chart);
        }
      }
    }
  });

  Vue.component("e-issue-summary", {
    props: ["publication", "issue"],
    data() {
      return {
        keywords: null,
        loaded: false,
        data: {
          title: "",
          author: "OECD",
          toc: null,
          cover: ""
        }
      };
    },
    created() {
      this.loadIssue = (issue: string) => {
        this.loaded = false;
        this.data.cover = "";
        $.get(this.url).then(data => {
          const doc = $(data);
          this.data.title = doc.find("h1").text();
          const toc = doc.find(".toc-container");
          toc.find("a[href]").each((index, el) => {
            // rewrite toc anchor links
            const href = $(el).attr("href");
            if (href[0] === "#") {
              $(el).attr("href", this.url + href);
            }
          });
          this.data.toc = toc.html();
          //$(this.$refs.toc).empty().append(toc); // doesn't work because ordering
          this.loaded = true;
        });
        metaPromise.then(meta => {
          if (meta.covers) {
            this.data.cover = meta.covers[issue];
          }
        });
      };

      keywordsPromise.then(response => {
        this.keywords = response;
        this.issue = this.issue || _.last(this.keywords.issues);
        this.loadIssue(this.issue);
      });
    },
    watch: {
      issue(issue: string) {
        this.loadIssue(issue);
      }
    },
    computed: {
      url() {
        return issueUrl(this.publication, this.issue);
      },
      isLatest() {
        return !this.keywords || _.last(this.keywords.issues) === this.issue;
      }
    },
    template: `
      <div class="row">
        <div class="col-2">
          <a v-if="loaded" :href="url">
            <img :src="data.cover" class="img-fluid">
          </a>
          <div v-else>
          <i class="fa fa-refresh spinning big" aria-hidden="true"></i>
          </div>
          <br>
          <div>
            <a :href="url" class="btn btn-outline-info btn-lg">
              Read issue
            </a>
          </div>
        </div>
        <div v-if="loaded" class="col">
          <p v-if="isLatest">Latest Issue</p>
          <h3>{{ data.title }}</h3>
          <p>{{ data.author }}</p>
          <div ref="toc" v-html="data.toc"></div>
        </div>
        <div v-else class="col loading">
          Loading...
        </div>
      </div>
     `
  });


  Vue.component("e-topic-summary", {
    props: ["publication", "issue", "topic", "what"],
    data() {
      return {
        headings: []
      };
    },
    watch: {
      topic(name) {
        this.loadConcepts();
      }
    },
    created() {
      this.loadConcepts = () => {
        conceptsPromise.then(tocConcepts => {
          pubsPromise.then(publications => {
            const concept = tocConcepts.byName[this.topic];
            if (concept) {
              this.headings = _.map(concept.headings, heading => {
                _.assign(heading, splitFilename(heading.filename, publications));
                return heading;
              });
            } else {
              this.headings = null;
            }
          });
        });
      };
      this.loadConcepts(this.topic);
    },
    methods: {
      link(heading) {
        return `${heading.filename}.html#${heading.id}`;
      }
    },
    template: `
      <div class="row">
        <div class="col">
          <h3>{{ topic }}</h3>
          <ul>
            <li v-for="heading in headings">
              <div><em>{{ heading.publication.short_title }}</em> {{ heading.issue }}</div>
              <div><a :href="link(heading)">{{ heading.heading }}</a></div>
            </li>
          </ul>
        </div>
      </div>
    `
  });

  Vue.component("e-volumes-issues", {
    props: ["publication"],
    data() {
      return {
        volumes: {}
      };
    },
    created() {
      metaPromise.then(meta => {
        this.volumes = _(meta.volumes).reverse().map(v => {
          if (v.issues) {
            v.issues = _.reverse(v.issues);
          }
          return v;
        }).valueOf();
      });
    },
    methods: {
      volumeClicked(volume) {
        if (volume.key) {
          this.$emit("click-issue", volume.key);
        }
      },
      issueClicked(volume, issue) {
        this.$emit("click-issue", "v" + issue.key);
      }
    },
    template: `
      <ul class="volumes">
        <li v-for="volume in volumes">
          <span v-if="volume.issues">
            {{ volume.name }}
            <ul v-if="volume.issues">
              <li v-for="issue in volume.issues">
                 <a href="#" @click.prevent="issueClicked(volume, issue)">{{ issue.name }}</a>
              </li>
            </ul>
          </span>
          <a v-else href="#" @click.prevent="volumeClicked(volume)">{{ volume.name }}</a>
        </li>
      </ul>
    `
  });

  const app = new Vue({
    data: {
      publication,
      current: {
        which: "coverage",
        what: "issue",
        issue: "",
        subject: "",
        country: ""
      }
    },
    methods: {
      issueClicked(issue: string, label: string, what: "country"|"subject") {
        this.current.what = issue && !label ? "issue" : what;
        this.current.issue = issue;
        this.current[what] = label;
      }
      /*
      issueClicked(issue: string, ) {
        this.current.what = "issue";
        this.current.issue = issue;
      },
      subjectClicked(subject: string, issue?: string) {
        this.current.what = "subject";
        this.current.subject = subject;
        this.current.issue = issue || "";
      },
      countryClicked(country: string, issue?: string) {
        this.current.what = "country";
        this.current.country = country;
        this.current.issue = issue || "";
      }
*/
    },
    created: function () {
    }
  }).$mount(selector);
}
