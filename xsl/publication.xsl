<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                exclude-result-prefixes="xs"
                version="2.0">
  <xsl:import href="base.xsl"/>

   <xsl:output method="html" indent="yes" />
  <!-- <xsl:output method="xml" indent="yes"/> -->

  <xsl:template match="/">
    <xsl:call-template name="html">
      <xsl:with-param name="title" select="html/body//h1"/>
      <xsl:with-param name="content">
        <xsl:apply-templates select="html/body/*"/>
      </xsl:with-param>
    </xsl:call-template>
  </xsl:template>

  <!-- Default match -->
  <xsl:template match="node() | @* | comment() | processing-instruction()" priority="-5">
    <xsl:copy>
      <xsl:apply-templates select="node() | @* | comment() | processing-instruction()"/>
    </xsl:copy>
  </xsl:template>
</xsl:stylesheet>
