<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
      xmlns:xs="http://www.w3.org/2001/XMLSchema"
      xpath-default-namespace="http://www.w3.org/1999/xhtml"
      exclude-result-prefixes="xs"
      version="2.0">

  <xsl:template name="html">
    <xsl:param name="content"/>
    <xsl:param name="title">
      <xsl:text>OECD</xsl:text>
    </xsl:param>
    <html xmlns:v-bind="https://vuejs.org/v2/api/#v-bind"
          xmlns:v-on="https://vuejs.org/v2/api/#v-on">
      <head>
        <meta charset="utf-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <title><xsl:value-of select="$title"></xsl:value-of></title>

        <link rel="stylesheet" href="vendor/jqcloud.min.css"/>
        <link rel="stylesheet" href="oecd.css"/>

        <!-- jquery 1.11.0 used for compatibility with jqcloud -->
        <script src="//ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js"></script>

        <script src="//cdnjs.cloudflare.com/ajax/libs/tether/1.4.0/js/tether.min.js" integrity="sha384-DztdAPBWPRXSA/3eYEEUWrWCy7G5KFbe8fFjk5JAIxUYHKkDx6Qin1DkWx51bBrb" crossorigin="anonymous"></script>
        <script src="//maxcdn.bootstrapcdn.com/bootstrap/4.0.0-alpha.6/js/bootstrap.min.js" integrity="sha384-vBWWzlZJ8ea9aCX4pEW3rVHjgjt7zpkNpZk+02D9phzyeVkE+jo0ieGizqPLForn" crossorigin="anonymous"></script>
        <script src="//cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.4/lodash.min.js"></script>
        <script src="//cdnjs.cloudflare.com/ajax/libs/moment.js/2.18.1/moment.min.js" integrity="sha256-1hjUhpc44NwiNg8OwMu2QzJXhD8kcj+sJA3aCQZoUjg=" crossorigin="anonymous"></script>
        <script src="//cdnjs.cloudflare.com/ajax/libs/Chart.js/2.5.0/Chart.bundle.min.js" integrity="sha256-+q+dGCSrVbejd3MDuzJHKsk2eXd4sF5XYEMfPZsOnYE=" crossorigin="anonymous"></script>
        <script src="//cdnjs.cloudflare.com/ajax/libs/vue/2.2.6/vue.min.js" integrity="sha256-cWZZjnj99rynB+b8FaNGUivxc1kJSRa8ZM/E77cDq0I=" crossorigin="anonymous"></script>
        <script src="//use.fontawesome.com/a87953a319.js"></script>

        <script src="vendor/jqcloud.min.js"></script>
        <script src="vendor/store.modern.min.js"></script>

        <script src="oecd.js"></script>
      </head>
      <body>
        <a name="top"></a>
        <xsl:copy-of select="$content"/>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
