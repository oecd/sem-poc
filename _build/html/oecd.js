/// <reference path="./typings/jquery/index.d.ts"/>
/// <reference path="./typings/lodash/index.d.ts"/>
/// <reference path="./typings/chart.js/index.d.ts"/>
/// <reference path="./typings/moment.d.ts"/>
/// <reference path="./typings/bootstrap.d.ts"/>
/// <reference path="./typings/vue/index.d.ts"/>
var terms;
var countries = null;
function fetchAnnotations() {
    terms = $('<div id="terms"></div>').hide().appendTo("body");
    return $.ajax({
        url: "terms.html",
        success: function (response) {
            $(response).find("style").remove().end().appendTo(terms);
            return terms;
        }
    });
}
function fetchCountries() {
    return $.getJSON("countries.json").then(function (response) {
        countries = {
            root: response.root,
            countries: response.countries,
            iso: _.keyBy(response.countries, "iso")
        };
        return countries;
    });
}
function fetchPublications() {
    return $.getJSON("publications.json")
        .then(function (response) { return response; }, function (err) {
        console.error("fetching publications", err);
    });
}
function splitFilename(filename, publications) {
    var parts = filename.split("-");
    return {
        publication: publications ? publications[parts[0]] : undefined,
        publicationName: parts[0],
        issue: parts.slice(1).join("-"),
        issueYear: parts[1].replace(/v/, "")
    };
}
;
;
function fetchTOCConcepts() {
    return $.getJSON("toc-concepts.json")
        .then(function (response) {
        _.each(response, function (concept) {
            concept.headings.sort(function (a, b) {
                // sort by issue date descending then publication
                var ia = splitFilename(a.filename);
                var ib = splitFilename(b.filename);
                var issue = -ia.issueYear.localeCompare(ib.issueYear);
                var pub = ia.publicationName.localeCompare(ib.publicationName);
                return issue === 0 ? pub : issue;
            });
        });
        return {
            byName: _.keyBy(response, "concept_name"),
            byId: _.keyBy(response, "concept_id")
        };
    });
}
function issueUrl(publication, issue) {
    return publication + "-" + issue + ".html";
}
function fetchTitle(conceptId) {
    var country = countries.iso[conceptId];
    if (country) {
        return country.name;
    }
    else if (terms) {
        return findTerm(conceptId).find(".term-name").text();
    }
}
function fetchAnnotation(conceptId, elemId) {
    if (countries.iso[conceptId]) {
        return fetchAnnotationCountry(conceptId, elemId);
    }
    else {
        return fetchAnnotationAgora(conceptId, elemId);
    }
}
function findTerm(conceptId) {
    if (terms) {
        return terms.find(".term[concept-id='" + conceptId + "']");
    }
    else {
        return $([]);
    }
}
function fetchAnnotationAgora(conceptId, elemId) {
    if (terms) {
        var term = findTerm(conceptId).clone().show();
        return $("#" + elemId).empty()
            .append(term.find(".term-expert-definition"))
            .append(term.find(".term-link").find("a").attr("target", "_blank").end())
            .append(term.find(".term-source"));
    }
}
// https://css-tricks.com/snippets/jquery/make-jquery-contains-case-insensitive/
$.expr[":"].icontains = $.expr.createPseudo(function (arg) {
    return function (elem) {
        return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
    };
});
$.expr[":"].special = $.expr.createPseudo(function (arg) {
    return function (elem) {
        var text = $(elem).text().trim();
        return text.slice(0, arg.length) !== arg && text.slice(-arg.length) === arg;
    };
});
function fetchAnnotationCountry(iso, elemId) {
    var country = countries.iso[iso];
    var chartUrl = countries.root.chart + (country.chart || "4NIq");
    var elem = $("#" + elemId).empty()
        .append("<iframe class=\"gdp-chart\" src=\"" + chartUrl + "\" mozallowfullscreen=\"true\" webkitallowfullscreen=\"true\" allowfullscreen=\"true\"><a class=\"btn btn-default\" href=\"" + chartUrl + "\" target=\"_blank\">GDP Chart</a></iframe>");
    var sections = $("div.mainhead:icontains('" + country.name + "')");
    var sectionButtons = sections.map(function (index, el) {
        var sectionId = $(el).attr("id");
        var text = $(el).text().toLocaleLowerCase() === country.name.toLocaleLowerCase()
            ? "<i class=\"fa fa-hand-o-right\" aria-hidden=\"true\"></i> View " + country.name + " section"
            : $(el).text().trim();
        // merge "deflation risks have faded ... in the united kingdom" type headings
        if (text[0] === '…' || text.slice(0, 3) === "...") {
            var before = $(el).parents("section")
                .prevAll("section")
                .filter(function (n, el) { return !!$(el).find(".mainhead:special('…')")[0]; })
                .first()
                .find(".mainhead");
            if (before) {
                text = before.text().trim() + " " + text.slice(1);
            }
        }
        return $("<div class=\"country-popover-button\"><a class=\"btn btn-block btn-outline-info\" href=\"#" + sectionId + "\">" + text + "</a></div>")[0];
    });
    sectionButtons.appendTo(elem);
    return elem.append($("<div class=\"links\"></div>")
        .append("<a class=\"btn btn-sm btn-primary\" href=\"" + countries.root.data + country.data + "\">\n               <i class=\"fa fa-line-chart\" aria-hidden=\"true\"></i> Country Data</a>")
        .append("<a class=\"btn btn-sm btn-primary\" href=\"" + countries.root.economic_survey + country.economic_survey + "\">Economic Survey</a>")
        .append("<a class=\"btn btn-sm btn-primary\" href=\"" + countries.root.ilibrary + country.ilibrary + "\">\n<i class=\"fa fa-search\" aria-hidden=\"true\"></i> Search</a>"));
}
function dismissAllPopovers() {
    $('[data-original-title]').popover('dispose');
}
function setupAnnotations() {
    $("span.line-annotation").on("click", function (ev) {
        var $self = $(this);
        dismissAllPopovers();
        var conceptId = $self.attr("concept-id");
        if (conceptId) {
            var divId = "tmp-id-" + $.now();
            var div = $('<div id="' + divId + '">Loading...</div>').hide().appendTo("body");
            fetchAnnotation(conceptId, divId);
            var title = fetchTitle(conceptId);
            var p = $self.popover({
                html: true,
                placement: "bottom",
                trigger: "manual",
                title: title,
                content: div.html()
            }).popover("show");
        }
        div.remove();
        return false;
    });
    // Dismiss all popovers when clicking outside with this code:
    $('html').on('click', function (e) {
        if (typeof $(e.target).data('original-title') == 'undefined') {
            dismissAllPopovers();
        }
    });
}
;
function getKeywords(dataset, countries) {
    return countries.then(function (countries) {
        var countryNames = _.map(countries.countries, "name");
        var countryGroupNames = [
            "Asia", "Continental Europe", "Europe", "European Union",
            "Central and Eastern Europe",
            "OECD area", "Euro area"
        ];
        var isGroup = function (kw) { return _.includes(countryGroupNames, kw.name) ||
            kw.name.indexOf("countries") >= 0; };
        var isNotCountry = function (kw) { return !_.includes(countryNames, kw.name); };
        return $.getJSON("keywords/" + dataset + ".json", function (response) {
            response.keywords = _.sortBy(response.keywords, "name");
            _a = _.partition(response.keywords, { type: "coverage" }), response.coverage = _a[0], response.subject = _a[1];
            _b = _.partition(response.coverage, isGroup), response.countryGroups = _b[0], response.countries = _b[1];
            return response;
            var _a, _b;
        });
    });
}
function chartColours(n) {
    var Helpers = Chart.helpers;
    var baseColours = [
        // "#4D4D4D", // gray
        "#5DA5DA",
        "#FAA43A",
        "#60BD68",
        "#F17CB0",
        "#B2912F",
        "#B276B2",
        "#DECF3F",
        "#F15854" // red
    ];
    var divs = Math.ceil(n / baseColours.length);
    return _.range(0, n).map(function (index) {
        var cycle = Math.floor(index / baseColours.length);
        var shift = Math.floor(cycle * 100 / divs);
        var c = Helpers.color(baseColours[index % baseColours.length]);
        c.hue(c.hue() + shift);
        return c;
    }).valueOf();
}
function timelineStyles(data) {
    var index = { coverage: 0, subject: 0 };
    var colours = _.mapValues(index, function (_, t) { return chartColours(data[t].length); });
    return _(data.keywords).map(function (kw) {
        var c = colours[kw.type][index[kw.type]++];
        return [kw.name, {
                backgroundColor: c.alpha(0.4).rgbString(),
                borderColor: c.alpha(1).rgbString(),
                pointBorderColor: c.rgbString(),
                pointHoverBackgroundColor: c.rgbString(),
                borderDash: kw.type === "coverage" ? [] : [2, 2]
            }];
    }).fromPairs().valueOf();
}
function shortenTermName(name) {
    var dontShorten = ["investment", "inflation"];
    var acronym = name.match(/(.*?)\s+\(([A-Z&\.0-9]+)\)/);
    if (_.some(dontShorten, function (d) { return _.startsWith(name, d); })) {
        // choose non-abbreviated term name
        return acronym ? acronym[1] : name;
    }
    else {
        // choose abbreviated term name
        return acronym ? acronym[2] : name;
    }
}
function termDefinitionHtml(term) {
    return "<div>" + term.find(".term-expert-definition").html() +
        (term.find(".term-link").html() || "") + "</div>";
}
function findConceptId(name, terms) {
    var term = terms.find(".term-name:contains('" + name + "')").parent();
    var conceptId = term.attr("concept-id");
    if (conceptId) {
        return {
            conceptId: conceptId,
            definitionHtml: termDefinitionHtml(term)
        };
    }
    else {
        return {};
    }
}
function getDocumentName() {
    var m = document.location.pathname.match(/.*\/([^.]+).html$/);
    return m ? m[1] : "";
}
function setupFootnotes() {
    $(function () {
        $("a.fnote")
            .popover({
            trigger: "manual",
            html: true,
            content: function () {
                return $(this).find(".content").html();
            },
            container: "body"
        })
            .click(function (evt) {
            evt.preventDefault();
            evt.stopPropagation();
            $(this).popover("show");
        })
            .blur(function (evt) {
            $(this).popover("hide");
        });
    });
}
function documentMain(publication, selector) {
    var countriesPromise = fetchCountries();
    var annoPromise = fetchAnnotations();
    var issueKeywordsPromise = $.getJSON("temis/" + getDocumentName() + ".json");
    setupFootnotes();
    var annotations = null;
    annoPromise.then(function (terms) { annotations = terms; });
    Vue.component("e-tag-cloud", {
        props: ["source", "highlight"],
        data: function () {
            return {
                selection: {},
                tags: {},
                highlight: []
            };
        },
        mounted: function () {
            var _this = this;
            this.setupTags().then(function (tags) {
                _this.tags = _.keyBy(tags, function (t) { return t.conceptId; });
                // convert to jqcloud format
                _this.cloud = _.map(tags, function (tag) {
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
                $(_this.$el)
                    .jQCloud(_this.cloud, {
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
                    .on("click", ".jqcloud-word", function (evt) {
                    var conceptId = $(evt.target).attr("data-concept-id");
                    var word = $(evt.target).text();
                    _this.toggleWord(conceptId, word);
                    evt.preventDefault();
                    evt.stopPropagation();
                })
                    .on("mouseenter mouseleave", ".jqcloud-word", function (evt) {
                    var conceptId = $(evt.target).attr("data-concept-id");
                    _this.$emit("hover", conceptId, evt.type === "mouseenter");
                });
            });
        },
        beforeDestroy: function () {
            $(this.$el);
            jQCloud("destroy")
                .popover("destroy")
                .off();
        },
        methods: {
            kick: function () {
                var _this = this;
                window.setTimeout(function () {
                    // trigger jQCloud repositioning
                    $(_this.$el).resize();
                }, 0);
            },
            setupTags: function () {
                var temisTags = function (type) {
                    return issueKeywordsPromise.then(function (keywords) {
                        return _(keywords)
                            .filter({ type: type })
                            .sortBy(function (kw) { return -kw.zScore; })
                            .map(function (keyword) {
                            return {
                                name: keyword.name,
                                word: keyword.name,
                                weight: keyword.zScore
                            };
                        })
                            .valueOf();
                    });
                };
                var setup = {
                    agora: function () {
                        var tagBlacklist = { "OECD": true, "prices": true };
                        var url = "cloud/" + getDocumentName() + ".json";
                        return annoPromise.then(function (terms) { return $.getJSON(url).then(function (words) {
                            return _(words).keys()
                                .sortBy(function (conceptId) { return -words[conceptId]; })
                                .take(100)
                                .map(function (conceptId) {
                                var term = findTerm(conceptId);
                                var name = term.find(".term-name").text();
                                return {
                                    name: name,
                                    word: shortenTermName(name),
                                    conceptId: conceptId,
                                    definitionHtml: termDefinitionHtml(term),
                                    weight: words[conceptId]
                                };
                            })
                                .filter(function (t) { return !tagBlacklist[t.word]; })
                                .uniqBy(function (t) { return t.word; })
                                .valueOf();
                        }); });
                    },
                    coverage: function () {
                        return temisTags("coverage").then(function (keywords) {
                            return countriesPromise.then(function (countries) {
                                var isos = _.mapValues(_.invertBy(countries.iso, "name"), _.head);
                                return _.map(keywords, function (kw) { return _.assign(kw, { conceptId: isos[kw.name] }); });
                            });
                        });
                    },
                    countries: function () {
                        return this.coverage().then(function (keywords) {
                            return countriesPromise.then(function (countries) {
                                return _.filter(keywords, function (tag) { return !!countries.iso[tag.conceptId]; });
                            });
                        });
                    },
                    subject: function () {
                        return temisTags("subject").then(function (keywords) {
                            return annoPromise.then(function (terms) { return _(keywords).map(function (kw) {
                                _.assign(kw, findConceptId(kw.name, $(terms)));
                                return kw;
                            }).take(100).valueOf(); });
                        });
                    }
                };
                return setup[this.source]();
            },
            toggleWord: function (conceptId, word) {
                var _this = this;
                if (conceptId) {
                    this.selection[conceptId] = !this.selection[conceptId];
                    // highlight word in tag cloud
                    $(this.$el).find(".jqcloud-word[data-concept-id='" + conceptId + "']")
                        .toggleClass("selected", this.selection[conceptId]);
                    var tags = _(this.selection)
                        .map(function (sel, conceptId) { return sel ? _this.tags[conceptId] : null; })
                        .filter().valueOf();
                    this.$emit("selectionchanged", tags);
                }
            }
        },
        watch: {
            highlight: {
                handler: function (conceptIds) {
                    var max = _.max(_.values(conceptIds));
                    $(this.$el).find(".jqcloud-word[data-concept-id]")
                        .each(function (index, elem) {
                        var count = conceptIds[$(elem).attr("data-concept-id")];
                        $(elem)
                            .toggleClass("highlighted", !!count)
                            .css("opacity", count ? 0.5 + count / (2 * max) : 1.0);
                    });
                },
                deep: true
            }
        },
        template: "<div class=\"tag-cloud\"></div>"
    });
    Vue.component("e-toc-filters", {
        props: ["selection"],
        template: "<div class=\"toc-filters\">\n      <span class=\"toc-filter\"\n            v-for=\"tag in selection\"\n            @click=\"$emit('remove', tag)\">\n        {{ tag.word }}\n      </span>\n    </div>"
    });
    Vue.component("e-toc", {
        props: ["selection", "highlight"],
        mounted: function () {
            var _this = this;
            $(this.$el).on("mouseenter mouseleave", "a", function (evt) {
                var item = $(evt.target);
                _this.onHover(item.attr("href").slice(1), evt.type === "mouseenter");
            });
            // this may be slow, could be better to do it offline
            var buildCoverage = function ($el) {
                var coverage = {};
                $el.find("li a").each(function (index, el) {
                    var target = $(el).attr("href");
                    if (target) {
                        var id = target.slice(1);
                        coverage[id] = _($("a[name='" + id + "']")
                            .next()
                            .find("span.line-annotation[concept-id]")
                            .map(function (index, span) { return $(span).attr("concept-id"); }))
                            .countBy()
                            .mergeWith(coverage[id], function (a, b) { return a + b; })
                            .valueOf();
                    }
                });
                return coverage;
            };
            var buildReverseCoverage = function (coverage) { return _(coverage)
                .mapValues(_.keys)
                .map(function (cs, id) { return _.map(cs, function (c) { return [c, id]; }); })
                .flatten()
                .groupBy(function (p) { return p[0]; })
                .mapValues(function (vs) { return _.map(vs, function (p) { return p[1]; }); })
                .valueOf(); };
            this.coverage = buildCoverage($(this.$el));
            this.reverseCoverage = buildReverseCoverage(this.coverage);
        },
        methods: {
            onHover: function (id, over) {
                var conceptIds = this.coverage[id];
                if (conceptIds) {
                    this.$emit("hover", conceptIds, over);
                }
            },
            eachTocHeading: function (callback) {
                return $(this.$el).find("li")
                    .each(function (index, el) {
                    var target = $(el).find("a").attr("href");
                    if (target) {
                        callback(target.slice(1), $(el));
                    }
                });
            }
        },
        watch: {
            selection: {
                handler: function (sel) {
                    var _this = this;
                    var selConceptIds = _.map(sel, function (s) { return s.conceptId; });
                    // filter toc items with jquery
                    $(this.$el).find("li")
                        .each(function (index, el) {
                        var target = $(el).find("a").attr("href");
                        if (target) {
                            var id_1 = target.slice(1);
                            var match = _.every(selConceptIds, function (conceptId) { return _this.coverage[id_1][conceptId]; });
                            $(el).toggle(!sel.length || match);
                        }
                    });
                },
                deep: true
            },
            highlight: function (conceptId) {
                var _this = this;
                this.eachTocHeading(function (id, $el) {
                    var count = _this.coverage[id][conceptId];
                    $el.toggleClass("highlighted", !!conceptId && !!count);
                });
            }
        },
        template: "<div><slot></slot></div>"
    });
    Vue.component("e-cloud-select", {
        properties: ["value"],
        data: function () {
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
            select: function (source) {
                this.value = source.name;
                this.$emit("input", source.name);
            }
        },
        template: (function () {
            var btn = function (cls) { return "\n        <button class=\"btn btn-sm " + cls + "\"\n                :class=\"{ 'btn-outline-info': value !== cloud.name, 'btn-info': value === cloud.name }\"\n                @click=\"select(cloud)\">\n          {{ cloud.text }}\n        </button>\n      "; };
            return "\n        <div class=\"row justify-content-end cloud-selector\">\n          <div class=\"col\">\n            <template v-for=\"cloud in sources\">\n              <template v-if=\"cloud.name\">\n              " + btn("btn-block") + "\n              </template>\n              <template v-else>\n                <template v-for=\"cloud in cloud.items\">\n                " + btn("coverage") + "\n                </template>\n              </template>\n            </template>\n          </div>\n        </div>\n      ";
        })()
    });
    var app = new Vue({
        data: {
            publication: publication,
            issue: getDocumentName(),
            tagSelection: {},
            cloudSource: "agora",
            highlightTagCloudConcepts: [],
            highlightTocConcept: ""
        },
        methods: {
            tagSelectionChanged: function (sel) {
                this.tagSelection = sel;
            },
            onTocHover: function (conceptIds, over) {
                this.highlightTagCloudConcepts = over ? conceptIds : [];
            },
            onTagCloudHover: function (conceptId, over) {
                this.highlightTocConcept = over ? conceptId : "";
            },
            onRemoveTag: function (tag) {
                this.$refs.cloud_agora.toggleWord(tag.conceptId, tag.word);
            }
        },
        watch: {
            cloudSource: function (source) {
                this.$refs["cloud_" + source].kick();
            }
        },
        mounted: function () {
            setupAnnotations();
        }
    }).$mount(selector);
}
function publicationMain(publication, selector) {
    var pubInfo = null;
    var countriesPromise = fetchCountries();
    var pubsPromise = fetchPublications();
    var metaPromise = pubsPromise.then(function (pubs) { return pubInfo = pubs[publication]; });
    var keywordsPromise = getKeywords(publication, countriesPromise);
    var conceptsPromise = fetchTOCConcepts();
    Vue.component("e-timeline", {
        props: ["dataset"],
        template: "\n      <div class=\"row\" v-if=\"keywords\">\n        <div class=\"col-2 chart-type-select\" ref=\"buttons\">\n          <div>\n          <e-chart-keywords :items=\"keywords.countries\" type=\"coverage\"\n                            :active=\"which\"\n                            @activate=\"select('coverage')\"\n                            v-model=\"countrySel\">\n            Country\n          </e-chart-keywords>\n          <e-chart-keywords :items=\"keywords.subject\" type=\"subject\"\n                            :active=\"which\"\n                            @activate=\"select('subject')\"\n                            v-model=\"subjectSel\">\n            Subject\n          </e-chart-keywords>\n          </div>\n          <e-chart-legend v-if=\"false\"\n              :items=\"which === 'coverage' ? countrySel : subjectSel\"\n              :styles=\"styles\">\n          </e-chart-legend>\n        </div>\n        <div class=\"col\">\n          <div v-if=\"false\">\n            <e-timeline-lines v-if=\"false\" :keywords=\"keywords\" :country-sel=\"countrySel\">\n            </e-timeline-lines>\n          </div>\n          <div v-else>\n            <div v-show=\"which === 'coverage'\">\n            <e-timeline-bubbles :styles=\"styles\"\n                                :keywords=\"keywords.countries\"\n                                :issues=\"keywords.issues\"\n                                :sel=\"countrySel\"\n                                @click-issue=\"issueClicked\">\n            </e-timeline-bubbles>\n            </div>\n            <div v-show=\"which !== 'coverage'\">\n            <e-timeline-bubbles :styles=\"styles\"\n                                :keywords=\"keywords.subject\"\n                                :issues=\"keywords.issues\"\n                                :sel=\"subjectSel\"\n                                @click-issue=\"issueClicked\">\n            </e-timeline-bubbles>\n            </div>\n          </div>\n        </div>\n      </div>\n    ",
        data: function () {
            return {
                which: "coverage",
                countrySel: ["China", "Russian Federation", "United States"],
                subjectSel: ["gross domestic product", "inflation", "productivity"],
                styles: {},
                keywords: null,
                legend: []
            };
        },
        methods: {
            issueClicked: function (issue, label) {
                this.$emit("click-issue", issue, label, this.which === "coverage" ? "country" : "subject");
            },
            select: function (which) {
                this.which = which;
                this.$emit("which-select", which);
            }
        },
        mounted: function () {
            var _this = this;
            var ctx = $(this.$el).find("canvas");
            keywordsPromise.then(function (response) {
                _this.keywords = response;
                _this.legend = _.map(_this.keywords.keywords, "name");
                _this.styles = timelineStyles(_this.keywords);
            });
        }
    });
    Vue.component("e-chart-keywords", {
        props: ["type", "items", "value", "active"],
        data: function () {
            return {
                sel: this.getSel(this.value)
            };
        },
        template: "\n      <span>\n        <button class=\"btn btn-sm\"\n                 :class=\"{ 'btn-primary': type === active, 'btn-secondary': type !== active }\"\n                 @click=\"show()\">\n          <slot>Keywords</slot>\n        </button>\n\n        <div class=\"modal fade\" ref=\"dlg\">\n          <div class=\"modal-dialog modal-lg\" role=\"document\">\n            <div class=\"modal-content\">\n              <div class=\"modal-header\">\n                <h5 class=\"modal-title\">Select {{ type }}</h5>\n                <button type=\"button\" class=\"close\" data-dismiss=\"modal\" aria-label=\"Close\">\n                  <span aria-hidden=\"true\">&times;</span>\n                </button>\n              </div>\n              <div class=\"modal-body\">\n<div class=\"row\">\n<div class=\"form-check col-3\" v-for=\"item in items\">\n  <label class=\"form-check-label\">\n    <input class=\"form-check-input\" type=\"checkbox\"\n           :checked=\"sel[item.name]\"\n           :value=\"item.name\"\n           @click=\"selected(item.name, $event.target.value)\">\n    {{ item.name }}\n  </label>\n</div>\n              </div>\n              <div class=\"modal-footer\">\n                <button type=\"button\" class=\"btn btn-primary\" @click=\"hideModal()\">Close</button>\n                <!--<button type=\"button\" class=\"btn btn-secondary\" data-dismiss=\"modal\">Close</button>-->\n              </div>\n            </div>\n          </div>\n        </div>\n      </span>\n    ",
        watch: {
            value: function (val) {
                this.sel = this.getSel(val);
            }
        },
        mounted: function () {
            // bootstrap modals like to be there
            $(this.$refs.dlg).appendTo("body");
        },
        methods: {
            show: function () {
                $(this.$refs.dlg).modal();
                this.$emit("activate", this.type);
            },
            hideModal: function () {
                $(this.$refs.dlg).modal("hide");
            },
            selected: function (keyword, val) {
                this.sel[keyword] = !this.sel[keyword];
                this.$emit("input", this.getSelectedItems());
            },
            getSelectedItems: function () {
                var _this = this;
                return _(this.items)
                    .filter(function (item) { return _this.sel[item.name]; })
                    .map("name")
                    .valueOf();
            },
            getSel: function (value) {
                return _(value).map(function (name) { return [name, true]; }).fromPairs().valueOf();
            }
        }
    });
    Vue.component("e-chart-legend", {
        props: ["items", "styles"],
        template: "\n      <ul class=\"legend\">\n      <li v-for=\"item in items\" class=\"colour\"\n          :style=\"style(item)\" @click=\"click(item, $event)\">{{ item }}</li>\n      </ul>\n    ",
        methods: {
            style: function (name) {
                return {
                    "background-color": this.styles[name].backgroundColor,
                    "border-color": this.styles[name].borderColor
                };
                //.toggleClass("active", kw.name === initialCountry)
            },
            click: function (name, evt) {
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
        data: function () {
            return {};
        },
        template: "<canvas width=\"400\" height=\"150\"></canvas>",
        mounted: function () {
            function timelineSetupLineChart(ctx, response, initialCountry) {
                var styles = timelineStyles(response);
                var minScore = _(response.keywords).map(function (item) { return _.map(item.values, "zScore"); }).flatten().min();
                var data = timelineLineChartData(response, initialCountry, styles);
                var chart = timelineLineChart(ctx, data);
                ctx.on("click", function (evt) {
                    var el = chart.getElementAtEvent(evt);
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
            function timelineLineChartData(response, initialCountry, styles) {
                return {
                    labels: response.issues,
                    datasets: _.map(response.keywords, function (kw, index) {
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
                            data: _.map(response.issues, function (name) { return issues[name] ? issues[name]["zScore"] : -1.0; }),
                            spanGaps: false
                        }, styles[kw.name]);
                    })
                };
            }
            function timelineLineChart(ctx, data) {
                return new Chart(ctx, {
                    type: 'line',
                    data: data,
                    options: {
                        scales: {
                            yAxes: [{
                                    ticks: {
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
        data: function () {
            return {};
        },
        template: "<canvas width=\"400\" height=\"150\"></canvas>",
        mounted: function () {
            var _this = this;
            var ctx = $(this.$el);
            var data = {
                datasets: _.map(this.keywords, function (kw, index) {
                    var issues = _.keyBy(kw.values, "issue");
                    return _.assign({
                        hidden: false,
                        label: kw.name,
                        data: _(_this.issues).map(function (name, x) {
                            return issues[name] ? {
                                x: x + 1,
                                y: _this.keywords.length - index,
                                r: issues[name]["zScore"],
                                zScore: issues[name]["zScore"]
                            } : null;
                        }).filter().valueOf(),
                        hoverRadius: 0.4
                    }, _this.styles[kw.name]);
                })
            };
            this.chart = new Chart(ctx, {
                type: 'bubble',
                data: data,
                options: {
                    scales: {
                        yAxes: [{
                                ticks: {
                                    display: true,
                                    autoSkip: false,
                                    min: 0,
                                    stepSize: 1,
                                    maxTicks: 20,
                                    callback: function (value, index, values) {
                                        return value >= 1 ? _this.sel[_this.sel.length - value] : "";
                                    }
                                },
                                gridLines: {
                                    // can remove horizontal grid lines but it looks a bit stupid
                                    display: true
                                },
                                scaleLabel: {
                                    display: false,
                                    labelString: "Country"
                                },
                                afterFit: function (scale) {
                                    // align y-axis of chart with bootstrap colum
                                    // the grid gutter width is 30px
                                    var column = $(".chart-type-select");
                                    if (column) {
                                        scale.width = column.width() + 30;
                                    }
                                }
                            }],
                        xAxes: [{
                                ticks: {
                                    display: true,
                                    autoSkip: false,
                                    min: 0,
                                    max: this.issues.length + 1,
                                    stepSize: 1,
                                    maxTicks: 20,
                                    callback: function (value, index, values) {
                                        return value >= 1 ? _this.issues[value - 1] : "";
                                    }
                                },
                                scaleLabel: {
                                    display: false,
                                    labelString: "Issue of publication"
                                }
                            }]
                    },
                    tooltips: {
                        callbacks: {
                            title: function (items) { return _this.issues[items[0].xLabel - 1]; },
                            label: function (item, data) {
                                var datasetLabel = data.datasets[item.datasetIndex].label || '';
                                var dataPoint = data.datasets[item.datasetIndex].data[item.index];
                                //return datasetLabel + ' (z-score: ' + dataPoint.zScore + ')';
                                return datasetLabel;
                            },
                            footer: function (items, data) { return "Click bubble for more"; }
                        }
                    },
                    legend: {
                        display: false,
                        position: "top"
                    }
                }
            });
            this.updateVisibility(this.chart);
            var axisIndex = function (evt) {
                var eventPosition = Chart.helpers.getRelativePosition(evt, _this.chart.chart);
                var mouseX = eventPosition.x;
                var mouseY = _this.chart.chart.height - 16 - eventPosition.y;
                var scalePoints = function (scale) { return _.range(scale.min, scale.max + 1)
                    .map(function (n) { return scale.getPixelForTick(n); }); };
                /*
                console.log(`mouse (${mouseX}, ${mouseY})`);
                _.each(this.chart.scales, (scale, key) => {
                  console.log(`scale ${key}`, scale);
                  const points = scalePoints(scale);
                  console.log(`points ${key}`, points);
                });
                */
                var scale = {
                    x: _this.chart.scales["x-axis-0"],
                    y: _this.chart.scales["y-axis-0"]
                };
                var points = _.mapValues(scale, scalePoints);
                var nearestIndex = function (val, points) {
                    return _.minBy(_.range(points.length), function (i) { return Math.abs(points[i] - val); });
                };
                if (mouseX < points.x[0] || mouseY < points.y[0]) {
                    return {
                        x: nearestIndex(mouseX, points.x),
                        y: nearestIndex(mouseY, points.y)
                    };
                }
                return null;
            };
            ctx.on("click", function (evt) {
                _this.destroyPopover();
                var el = _this.chart.getElementAtEvent(evt);
                if (el && el.length) {
                    var pt = el[0];
                    var issues = _.map(_this.keywords[pt._datasetIndex].values, "issue");
                    var issue = issues[pt._index];
                    var label = data.datasets[pt._datasetIndex].label;
                    if (issue) {
                        _this.showPopover(pt._view.x, pt._view.y, event.target.width, event.target.height, issue, label);
                    }
                }
                else {
                    var nearest = axisIndex(evt);
                    if (nearest) {
                        var issue = _this.issues[nearest.x - 1];
                        var label = _this.sel[_this.sel.length - nearest.y];
                        _this.$emit("click-issue", nearest.y === 0 ? issue : "", nearest.x === 0 ? label : "");
                    }
                }
            });
            this.initPopover();
        },
        created: function () {
            var _this = this;
            var popover = {
                instance: null,
                call: function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i] = arguments[_i];
                    }
                    return $(_this.$el).popover.apply($(_this.$el), args);
                },
                title: function () { return pubInfo.title; },
                content: "info"
            };
            this.initPopover = function (opts) {
                return popover.instance = popover.call(_.assign({
                    trigger: "manual",
                    title: function () { return popover.title; },
                    content: function () { return popover.content; },
                    html: true,
                    placement: "right",
                    container: "body"
                }, opts));
            };
            this.destroyPopover = function () {
                if (popover.instance) {
                    popover.call("dispose");
                    popover.instance = null;
                }
            };
            this.showPopover = function (x, y, width, height, issue, topic) {
                _this.destroyPopover();
                popover.content = "<div class=\"chart-popover\">\n          <button class=\"btn btn-sm btn-block btn-outline-primary\" data-what=\"issue\">Issue " + issue + " Table of Contents</button>\n          <button class=\"btn btn-sm btn-block btn-outline-primary\" data-what=\"topic\">Sections about " + topic + "</button>\n        </div>";
                var push = 6; // move it slightly to cover over tooltip
                // invert the bootstrap tethering and place popover at co-ordinate
                var tetherHack = x * 2 < width ?
                    { offset: height / 2 - y + "px " + (width - x + push) + "px", placement: "right" }
                    : { offset: height / 2 - y + "px " + (-x - push) + "px", placement: "left" };
                _this.initPopover(tetherHack);
                popover.call("show");
                popover.content = $(".chart-popover")
                    .on("click", "button", function (evt) {
                    var what = $(evt.target).attr("data-what");
                    if (what === "topic") {
                        _this.$emit("click-issue", "", topic);
                    }
                    else {
                        _this.$emit("click-issue", issue, "");
                    }
                    _this.destroyPopover();
                });
            };
        },
        beforeDestroy: function () {
            this.destroyPopover();
        },
        methods: {
            updateVisibility: function (chart) {
                var sel = this.sel;
                var zScores = _(this.keywords)
                    .map(function (item) { return _.map(item.values, "zScore"); })
                    .flatten();
                var minScore = zScores.min();
                var maxScore = zScores.max();
                var size = 30;
                var normal = function (zScore) { return (zScore - minScore) / (maxScore - minScore); };
                var radius = function (zScore) { return size * Math.sqrt(zScore); };
                var offset = function (score, prev) { return (score - prev) * 0.33 / prev; };
                _.each(chart.data.datasets, function (dataset) {
                    var index = _.indexOf(sel, dataset.label);
                    dataset["hidden"] = index < 0;
                    var prevZ = normal(dataset.data[0].zScore);
                    _.each(dataset.data, function (point) {
                        var z = normal(point.zScore);
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
            sel: function (val) {
                if (this.chart) {
                    this.updateVisibility(this.chart);
                }
            }
        }
    });
    Vue.component("e-issue-summary", {
        props: ["publication", "issue"],
        data: function () {
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
        created: function () {
            var _this = this;
            this.loadIssue = function (issue) {
                _this.loaded = false;
                _this.data.cover = "";
                $.get(_this.url).then(function (data) {
                    var doc = $(data);
                    _this.data.title = doc.find("h1").text();
                    var toc = doc.find(".toc-container");
                    toc.find("a[href]").each(function (index, el) {
                        // rewrite toc anchor links
                        var href = $(el).attr("href");
                        if (href[0] === "#") {
                            $(el).attr("href", _this.url + href);
                        }
                    });
                    _this.data.toc = toc.html();
                    //$(this.$refs.toc).empty().append(toc); // doesn't work because ordering
                    _this.loaded = true;
                });
                metaPromise.then(function (meta) {
                    if (meta.covers) {
                        _this.data.cover = meta.covers[issue];
                    }
                });
            };
            keywordsPromise.then(function (response) {
                _this.keywords = response;
                _this.issue = _this.issue || _.last(_this.keywords.issues);
                _this.loadIssue(_this.issue);
            });
        },
        watch: {
            issue: function (issue) {
                this.loadIssue(issue);
            }
        },
        computed: {
            url: function () {
                return issueUrl(this.publication, this.issue);
            },
            isLatest: function () {
                return !this.keywords || _.last(this.keywords.issues) === this.issue;
            }
        },
        template: "\n      <div class=\"row\">\n        <div class=\"col-2\">\n          <a v-if=\"loaded\" :href=\"url\">\n            <img :src=\"data.cover\" class=\"img-fluid\">\n          </a>\n          <div v-else>\n          <i class=\"fa fa-refresh spinning big\" aria-hidden=\"true\"></i>\n          </div>\n          <br>\n          <div>\n            <a :href=\"url\" class=\"btn btn-outline-info btn-lg\">\n              Read issue\n            </a>\n          </div>\n        </div>\n        <div v-if=\"loaded\" class=\"col\">\n          <p v-if=\"isLatest\">Latest Issue</p>\n          <h3>{{ data.title }}</h3>\n          <p>{{ data.author }}</p>\n          <div ref=\"toc\" v-html=\"data.toc\"></div>\n        </div>\n        <div v-else class=\"col loading\">\n          Loading...\n        </div>\n      </div>\n     "
    });
    Vue.component("e-topic-summary", {
        props: ["publication", "issue", "topic", "what"],
        data: function () {
            return {
                headings: []
            };
        },
        watch: {
            topic: function (name) {
                this.loadConcepts();
            }
        },
        created: function () {
            var _this = this;
            this.loadConcepts = function () {
                conceptsPromise.then(function (tocConcepts) {
                    pubsPromise.then(function (publications) {
                        var concept = tocConcepts.byName[_this.topic];
                        if (concept) {
                            _this.headings = _.map(concept.headings, function (heading) {
                                _.assign(heading, splitFilename(heading.filename, publications));
                                return heading;
                            });
                        }
                        else {
                            _this.headings = null;
                        }
                    });
                });
            };
            this.loadConcepts(this.topic);
        },
        methods: {
            link: function (heading) {
                return heading.filename + ".html#" + heading.id;
            }
        },
        template: "\n      <div class=\"row\">\n        <div class=\"col\">\n          <h3>{{ topic }}</h3>\n          <ul>\n            <li v-for=\"heading in headings\">\n              <div><em>{{ heading.publication.short_title }}</em> {{ heading.issue }}</div>\n              <div><a :href=\"link(heading)\">{{ heading.heading }}</a></div>\n            </li>\n          </ul>\n        </div>\n      </div>\n    "
    });
    Vue.component("e-volumes-issues", {
        props: ["publication"],
        data: function () {
            return {
                volumes: {}
            };
        },
        created: function () {
            var _this = this;
            metaPromise.then(function (meta) {
                _this.volumes = _(meta.volumes).reverse().map(function (v) {
                    if (v.issues) {
                        v.issues = _.reverse(v.issues);
                    }
                    return v;
                }).valueOf();
            });
        },
        methods: {
            volumeClicked: function (volume) {
                if (volume.key) {
                    this.$emit("click-issue", volume.key);
                }
            },
            issueClicked: function (volume, issue) {
                this.$emit("click-issue", "v" + issue.key);
            }
        },
        template: "\n      <ul class=\"volumes\">\n        <li v-for=\"volume in volumes\">\n          <span v-if=\"volume.issues\">\n            {{ volume.name }}\n            <ul v-if=\"volume.issues\">\n              <li v-for=\"issue in volume.issues\">\n                 <a href=\"#\" @click.prevent=\"issueClicked(volume, issue)\">{{ issue.name }}</a>\n              </li>\n            </ul>\n          </span>\n          <a v-else href=\"#\" @click.prevent=\"volumeClicked(volume)\">{{ volume.name }}</a>\n        </li>\n      </ul>\n    "
    });
    var app = new Vue({
        data: {
            publication: publication,
            current: {
                which: "coverage",
                what: "issue",
                issue: "",
                subject: "",
                country: ""
            }
        },
        methods: {
            issueClicked: function (issue, label, what) {
                this.current.what = issue && !label ? "issue" : what;
                this.current.issue = issue;
                this.current[what] = label;
            }
        },
        created: function () {
        }
    }).$mount(selector);
}
//# sourceMappingURL=oecd.js.map