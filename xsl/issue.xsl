<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
      xmlns:xs="http://www.w3.org/2001/XMLSchema"
      xmlns:n="http://www.oecd.org/ns/narr-doc"
      xmlns:md="http://www.oecd.org/ns/lambda/schema/"
      xmlns:line="http://67bricks.com/annotation/"
      xmlns:v-bind="https://vuejs.org/v2/api/#v-bind"
      xmlns:v-on="https://vuejs.org/v2/api/#v-on"
      xpath-default-namespace="http://www.oecd.org/ns/narr-doc"
      exclude-result-prefixes="xs"
      version="2.0">
    <xsl:import href="base.xsl"/>

    <xsl:output method="html"/>
    <xsl:param name="publication"/>
    <xsl:param name="next"/>
    <xsl:param name="prev"/>

    <xsl:template match="/">
      <xsl:call-template name="html">
        <xsl:with-param name="title" select="//md:metadataSet/md:title"/>
        <xsl:with-param name="content">
          <!-- navbar -->
          <nav class="navbar navbar-toggleable-md navbar-light bg-faded">
            <button class="navbar-toggler navbar-toggler-right" type="button" data-toggle="collapse" data-target="#navbarsExampleDefault" aria-controls="navbarsExampleDefault" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
            </button>
            <a class="navbar-brand" href="/sem-poc/">Semantic POC</a>

            <div class="collapse navbar-collapse" id="navbarsExampleDefault">
              <ul class="navbar-nav mr-auto">
                <li class="nav-item">
                  <a class="nav-link" href="{$publication}.html"><xsl:value-of select="$publication"/></a>
                </li>
              </ul>
              <ul class="navbar-nav ml-auto">
                <xsl:if test="$prev != ''">
                <li class="nav-item">
                  <a class="nav-link" href="{$prev}.html">« Previous Issue</a>
                </li>
                </xsl:if>
                <xsl:if test="$next != ''">
                <li class="nav-item">
                  <!-- <a class="btn btn-outline-primary" href="{$next}.html">Next Issue »</a> -->
                  <a class="nav-link" href="{$next}.html">Next Issue »</a>
                </li>
                </xsl:if>
              </ul>
            </div>
          </nav>
          <div class="hidden">
          <!-- Main jumbotron for a primary marketing message or call to action -->
          <div class="jumbotron">
            <div class="container">
              <h1 class="display-4">
                OECD Economic Outlook
              </h1>
              <p>blah blah</p>
            </div>
          </div>
          </div>

          <div class="container" id="main">
            <h1><xsl:value-of select="//md:metadataSet/md:title"/></h1>
            <div class="row">
              <div class="col-12 col-md-3 push-md-9 oecd-sidebar">
                <xsl:call-template name="toc">
                  <xsl:with-param name="doc">
                    <xsl:copy-of select="."/>
                  </xsl:with-param>
                </xsl:call-template>
              </div>
              <div class="col-12 col-md-9 pull-md-3 oecd-content">
                <e-cloud-select v-model="cloudSource"></e-cloud-select>

                <div class="row">
                  <div class="col">
                    <div v-show="cloudSource === 'agora'">
                      <e-tag-cloud
                          ref="cloud_agora"
                          source="agora"
                          v-on:selectionchanged="tagSelectionChanged"
                          v-on:hover="onTagCloudHover"
                          v-bind:highlight="highlightTagCloudConcepts">
                        <!-- this is just a placeholder to keep sizing -->
                        <div class="tag-cloud"></div>
                      </e-tag-cloud>
                    </div>
                    <div v-show="cloudSource === 'countries'">
                      <e-tag-cloud
                          source="countries"
                          ref="cloud_countries"
                          v-on:selectionchanged="tagSelectionChanged"
                          v-on:hover="onTagCloudHover"
                          v-bind:highlight="highlightTagCloudConcepts">
                      </e-tag-cloud>
                    </div>
                    <div v-show="cloudSource === 'coverage'">
                      <e-tag-cloud
                          source="coverage"
                          ref="cloud_coverage"
                          v-on:selectionchanged="tagSelectionChanged"
                          v-on:hover="onTagCloudHover"
                          v-bind:highlight="highlightTagCloudConcepts">
                      </e-tag-cloud>
                    </div>
                    <div v-show="cloudSource === 'subject'">
                      <e-tag-cloud
                          source="subject"
                          ref="cloud_subject"
                          v-on:selectionchanged="tagSelectionChanged"
                          v-on:hover="onTagCloudHover"
                          v-bind:highlight="highlightTagCloudConcepts">
                      </e-tag-cloud>
                    </div>
                  </div>
                </div>

                <xsl:apply-templates/>
              </div>
            </div>
          </div>
          <script>
            documentMain("{$publication}", "#main");
          </script>
        </xsl:with-param>
      </xsl:call-template>
    </xsl:template>

    <xsl:template name="toc">
      <xsl:param name="doc"/>
      <div id="toc" class="toc-container">
        <h2>Table of Contents</h2>
        <e-toc-filters v-bind:selection="tagSelection"
                       v-on:remove="onRemoveTag"></e-toc-filters>
        <e-toc
            v-bind:selection="tagSelection"
            v-bind:highlight="highlightTocConcept"
            v-on:hover="onTocHover">
        <ul>
          <xsl:for-each select="$doc//frontmatter">
            <li>
              <a href="#top">Front Matter</a>
              <ul>
                <xsl:for-each select="foreword">
                  <li><a href="{concat('#', @id)}">Foreword</a></li>
                </xsl:for-each>
                <xsl:for-each select="introduction | execsumm">
                  <li><a href="{concat('#', @id)}"><xsl:value-of select="heading/mainhead/text()"/></a></li>
                </xsl:for-each>
              </ul>
            </li>
          </xsl:for-each>

          <xsl:for-each select="$doc//chapter">
            <xsl:variable name="chapterId" select="@id"/>
            <li>
              <a href="{concat('#',$chapterId)}"><xsl:value-of select="heading/mainhead/text()"/></a>
              <ul>
                <xsl:for-each select="section">
                  <xsl:variable name="depth" select="count(ancestor::section)+1"/>
                  <li><a href="{concat('#',@id)}"><xsl:value-of select="heading/mainhead/text() | heading/mainhead/*[not(self::fnote)]"/></a></li>
                </xsl:for-each>
              </ul>
            </li>
          </xsl:for-each>
          <xsl:for-each select="$doc//backmatter">
            <li>
              Back Matter
              <ul>
                <xsl:for-each select="annex">
                  <xsl:variable name="id" select="@id"/>
                  <li><a href="{concat('#',$id)}"><xsl:value-of select="heading"/></a></li>
                </xsl:for-each>
              </ul>
            </li>
          </xsl:for-each>
        </ul>
        </e-toc>
      </div>
    </xsl:template>

    <xsl:template match="md:metadataSet | productionMetadata" />

    <!-- Emphasis -->
    <xsl:template match="emphasis[@emph='bolditalic']"><b><i><xsl:apply-templates/></i></b></xsl:template>
    <xsl:template match="emphasis[@emph='bold']"><b><xsl:apply-templates/></b></xsl:template>
    <xsl:template match="emphasis[@emph='italic']"><i><xsl:apply-templates/></i></xsl:template>
    <xsl:template match="emphasis[@emph='normal']"><em><xsl:apply-templates/></em></xsl:template>

    <!-- Structural elements -->
    <xsl:template match="heading">
        <xsl:variable name="depth" select="count(ancestor::section)+2"/>
        <xsl:element name="{concat('h',$depth)}">
            <xsl:apply-templates/>
        </xsl:element>
    </xsl:template>

    <!-- anchor links for chapters and sections -->
    <xsl:template match="chapter | section">
      <xsl:variable name="id" select="@id"/>
      <a name="{$id}"/>
      <xsl:copy>
        <xsl:apply-templates/>
      </xsl:copy>
    </xsl:template>

    <xsl:template match="randlist[@type='bullet']"><ul><xsl:apply-templates/></ul></xsl:template>

    <xsl:template match="p | li">
        <xsl:copy>
            <xsl:apply-templates select="node() | @* | comment() | processing-instruction()"/>
        </xsl:copy>
    </xsl:template>

    <!-- Inline elements -->
    <xsl:template match="xref | shortcitation">
        <span class="{local-name()}">
            <xsl:apply-templates select="node() | @* | comment() | processing-instruction()"/>
        </span>
    </xsl:template>

    <xsl:template match="sup | sub">
      <xsl:copy>
        <xsl:apply-templates select="node() | @* | comment() | processing-instruction()"/>
      </xsl:copy>
    </xsl:template>

    <!-- Statlink Hyperlinks -->
    <xsl:template match="hyperlink[@target='statlink']">
      <span class="statlink">
        Statlink
        <img src="images/statlink.gif"/>
        <a href="{@url}"><xsl:value-of select="@url"/></a>
      </span>
    </xsl:template>

    <!-- Other Hyperlinks -->
    <xsl:template match="hyperlink">
      <a href="{@url}" class="hyperlink {@target}">
        <xsl:copy-of select="hyperlink"></xsl:copy-of>
      </a>
    </xsl:template>

    <!-- Figures -->
    <xsl:template match="figure | tablegrp">
      <div class="card {local-name()}">
        <div class="card-block">
          <xsl:apply-templates select="node() | @* | comment() | processing-instruction()" />
        </div>
      </div>
    </xsl:template>

    <xsl:template match="figureheading | tableheading">
      <h4 class="card-title {local-name()}">
        <xsl:apply-templates/>
      </h4>
    </xsl:template>

    <xsl:template match="figuresubheading | tablesubheading">
      <h6 class="card-subtitle mb-2 text-muted {local-name()}">
        <xsl:apply-templates/>
      </h6>
    </xsl:template>

    <!-- Tables -->
    <xsl:template match="table | tbody">
        <xsl:copy>
            <xsl:apply-templates select="node() | @* | comment() | processing-instruction()"/>
        </xsl:copy>
    </xsl:template>
    <xsl:template match="row"><tr><xsl:apply-templates  select="node() | @* | comment() | processing-instruction()"/></tr></xsl:template>
    <xsl:template match="entry"><td><xsl:apply-templates  select="node() | @* | comment() | processing-instruction()"/></td></xsl:template>

    <!-- Footnotes -->
    <xsl:template match="fnote">
      <a href="#{@id}" class="fnote">*
        <span class="content">
          <xsl:apply-templates/>
        </span>
      </a>
    </xsl:template>

    <!-- bricksTermRecognition annotations -->
    <xsl:template match="line:annotation">
      <!-- fixme: match nested annotations and flatten list of concept ids -->
      <span class="line-annotation"><xsl:apply-templates select="node()|@*"/></span>
    </xsl:template>

    <!-- Default matches -->
    <xsl:template match="*" priority="-1">
        <div class="{local-name()}">
            <xsl:apply-templates select="node() | @* | comment() | processing-instruction()"/>
        </div>
    </xsl:template>

    <xsl:template match="node() | @* | comment() | processing-instruction()" priority="-5">
        <xsl:copy>
            <xsl:apply-templates select="node() | @* | comment() | processing-instruction()"/>
        </xsl:copy>
    </xsl:template>

</xsl:stylesheet>
