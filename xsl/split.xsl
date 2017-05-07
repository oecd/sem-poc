<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
      xmlns:xs="http://www.w3.org/2001/XMLSchema"
      xmlns:n="http://www.oecd.org/ns/narr-doc"
      xmlns:md="http://www.oecd.org/ns/lambda/schema/"
      xpath-default-namespace="http://www.oecd.org/ns/narr-doc"
      exclude-result-prefixes="xs"
      version="2.0">
    
    <xsl:variable name="bookId" select="(//isbn[@type='P1'])[1]"/>
    
    <xsl:template match="chapter">
        <xsl:variable name="chapterNum" select="count(preceding-sibling::chapter)+1"/>
        <xsl:result-document method="xml" href="{concat($bookId,'_chapter_',$chapterNum,'.xml')}">
            <chapter>
                <xsl:apply-templates select="node() | @* | comment() | processing-instruction()"/>
            </chapter>
        </xsl:result-document>
    </xsl:template>
    
    <xsl:template match="node() | @* | comment() | processing-instruction()" priority="-5">
        <xsl:copy>
            <xsl:apply-templates select="node() | @* | comment() | processing-instruction()"/>
        </xsl:copy>
    </xsl:template>
    

</xsl:stylesheet>
