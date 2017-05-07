import Development.Shake
import Development.Shake.Command
import Development.Shake.FilePath
import Development.Shake.Util
import System.FilePath
import System.Directory (createDirectoryIfMissing)
import Control.Monad.IO.Class (liftIO)
import Control.Monad (forM_)
import Text.Read (readMaybe)
import Data.List (isPrefixOf)
import Data.Maybe (catMaybes)

buildDir = "_build" :: FilePath

build :: FilePath -> FilePath
build = (</>) buildDir

html :: FilePath -> FilePath
html f = build "html" </> f

main :: IO ()
main = shakeArgs shakeOptions{shakeFiles=buildDir} $ do
    phony "clean" $ do
      putNormal "Cleaning files in _build"
      removeFilesAfter buildDir ["//*"]

    html "oecd.js" %> \out -> do
      let script = "assets/oecd.ts"
      need [script]
      (Exit _, Stdout (), Stderr ()) <- cmd "tsc --sourceMap --outDir" [takeDirectory out, script]
      return ()

    html "oecd.css" %> \out -> do
      let sass = "assets/oecd.scss"
      need [sass, "assets/bootstrap-4.0.0-alpha.6/scss/bootstrap.scss"]
      cmd "sassc" [sass, out]

    let copies = html "vendor/copies.txt"
    let assetFiles = map html ["oecd.js", "oecd.css"] ++ [copies]

    phony "assets" $ need assetFiles

    html "terms.html" %> \out -> do
      let script = "scripts/terms2html.py"
          csv = "csv/agora.csv"
      need [csv, script, "scripts/terms.py"]
      cmd "python3" [script, csv, out]

    build "taxonomies/agora.ttl" %> \out -> do
      let script = "scripts/terms2skos.py"
          csv = "csv/agora.csv"
      need [csv, script, "scripts/terms.py"]
      cmd "python3" [script, csv, out]

    let xsl n = "xsl" </> n -<.> "xsl"
    let htmlStylesheet = xsl "issue"
    let pubStylesheet = xsl "publication"
    let baseStylesheet = xsl "base"

    -- issue htmls
    html "*.html" %> \out -> do
      let xml = build "annotated" </> takeBaseName out -<.> "xml"
          (pub, issue) = getPubIssue out
      need $ [ xml, htmlStylesheet, baseStylesheet]
      orderOnly $ assetFiles ++ map html
                [ "terms.html"
                , "countries.json"
                , "cloud" </> takeBaseName out -<.> "json"
                , "temis" </> takeBaseName out -<.> "json"
                , "keywords" </> pub -<.> "json"
                ]
      cmd "saxon8 -o" [out, xml, htmlStylesheet]
        (catMaybes [ Just $ "publication=" ++ pub
                   , ("next=" ++) <$> findNext False pub issue
                   , ("prev=" ++) <$> findNext True pub issue
                   ])

    let docHtmls = [html f -<.> "html" | f <- documents]

    build "annotated/*.xml" %> \out -> do
      let xml = getDocXML out
          taxonomy = "all"
      need [xml] {- ++ ["../conf/taxonomies/" ++ taxonomy ++ ".ttl"] -}
      annotateXml taxonomy out xml

    html "toc-concepts.json" %> \out -> do
      let annotated = [build "annotated" </> takeFileName doc | doc <- documents]
          script = "scripts/toc_concepts.py"
      need annotated
      cmd "python3" [script] "--output" (out : annotated)

    html "publications.json" %> \out -> do
      let src = takeFileName out
      need [src]
      copyFile' src out

    html "countries.json" %> \out -> do
      let csv = "csv/countries.csv"
          script = "scripts/countries2json.py"
      need [csv]
      cmd "python3" [script, csv, out, "/dev/null"]

    html "cloud/*.json" %> \out -> do
      let script = "scripts/get_words.py"
          xml = build "annotated" </> (takeBaseName out) -<.> "xml"
      need [xml, script]
      Stdout json <- cmd "python3" [script, xml]
      writeFile' out json

    let allClouds = [html "cloud" </> xml -<.> "json" | xml <- documents]
    let pubKeywords = [html "keywords" </> pub -<.> "json" | pub <- publications]
    let allKeywords = [html "temis" </> xml -<.> "json" | xml <- documents]
    phony "all_keywords" $ need (allKeywords ++ pubKeywords ++ allClouds)

    -- per-issue keywords from luxid
    -- used for alternate clouds
    html "temis/*.json" %> \out -> do
      let luxid = getLuxidReport (takeFileName out -<.> ".xml")
          script = "scripts/luxid2json.py"
      need [luxid, script]
      cmd "python3" [script, luxid, out]

    -- luxid keywords collected into series of publications
    map keywordsForPub publications |%> \out -> do
      let pub = takeBaseName out
          startsWith = \n -> (== n) . take (length n)
          luxids = map getLuxidReport (filter (startsWith pub) documents)
          script = "scripts/collect_reports.py"
      need (script:"scripts/luxid2json.py":luxids)
      Stdout r <- cmd "python3" ([script, pub] ++ luxids)
      writeFile' out r

    let pubHtmls = [html p -<.> "html" | p <- publications]

    -- publication html
    pubHtmls |%> \out -> do
      let pub = takeBaseName out
          source = "assets" </> takeFileName out
          keywords = keywordsForPub pub
      need [source, pubStylesheet, baseStylesheet
           , html "publications.json"
           , html "toc-concepts.json"]
      orderOnly (keywords:assetFiles)
      cmd "saxon8 -o" [out, source, pubStylesheet] ["publication=" ++ pub]

    -- just a plain page with links to the publications
    html "index.html" %> \out -> do
      let source = "assets" </> takeFileName out
      need [source, pubStylesheet, baseStylesheet]
      cmd "saxon8 -o" [out, source, pubStylesheet]

    copies %> \out -> do
      vendor <- getDirectoryFiles "" ["assets/vendor//*"]
      images <- getDirectoryFiles "" ["assets/images/*"]
      let src = vendor ++ images
      need src
      forM_ src $ \f -> do
        let outf = html (dropDirectory1 f)
        liftIO $ createDirectoryIfMissing True (takeDirectory outf)
        putNormal $ "Copy " ++ f ++ " → " ++ outf
        copyFileChanged f outf
      writeFile' out (unlines src)

    let allHtmls = docHtmls ++ pubHtmls ++ [html "index.html", copies]
    phony "htmls" $ need allHtmls
    want ["htmls"]

getPubIssue :: FilePath -> (String, String)
getPubIssue f = (takeWhile (/= '-') b, tail $ dropWhile (/= '-') b)
  where b = takeBaseName f

findNext :: Bool -> String -> String -> Maybe String
findNext rev pub issue = next issue issues
  where
    next :: String -> [String] -> Maybe String
    next x (a:aa:aas) | isIssue x a = Just aa
                      | otherwise   = next x (aa:aas)
    next _ _ = Nothing
    issues = order $ filter pubIssue fs
    order = if rev then reverse else id
    fs = map takeBaseName documents
    pubIssue f = pub `isPrefixOf` f
    isIssue i f = (pub ++ "-" ++ i) `isPrefixOf` f

keywordsForPub :: String -> FilePath
keywordsForPub p = html "keywords" </> p -<.> "json"

getLuxidReport :: FilePath -> FilePath
-- get luxid report from document
getLuxidReport doc = "temis.nobib/report" </> "Report-" ++ doc

getDocXML :: FilePath -> FilePath
getDocXML out = "temis.nobib/xml" </> takeFileName out

publications :: [String]
publications = ["eco_outlook", "growth"]

documents :: [FilePath]
documents = [ "eco_outlook-v2011-1-en.xml"
            , "eco_outlook-v2011-2-en.xml"
            , "eco_outlook-v2012-1-en.xml"
            , "eco_outlook-v2012-2-en.xml"
            , "eco_outlook-v2013-1-en.xml"
            , "eco_outlook-v2013-2-en.xml"
            , "eco_outlook-v2014-1-en.xml"
            , "eco_outlook-v2014-2-en.xml"
            , "eco_outlook-v2015-1-en.xml"
            , "eco_outlook-v2015-2-en.xml"
            , "eco_outlook-v2016-1-en.xml"
            , "eco_outlook-v2016-2-en.xml"
            , "growth-2011-en.xml"
            , "growth-2012-en.xml"
            , "growth-2013-en.xml"
            , "growth-2014-en.xml"
            , "growth-2015-en.xml" -- problem annotating
            , "growth-2016-en.xml"
            ]

annotateXml, annotateXmlReal, annotateXmlDummy :: String -> FilePath -> FilePath -> Action ()
annotateXmlReal taxonomy output input =
  cmd "curl -o " [output] "-X POST" [url] "-F" ["termsDocument=@" ++ input]
  where url = "http://localhost:5070/annotate/" ++ taxonomy
annotateXmlDummy _ output input = copyFileChanged input output
annotateXml _ _ _ = return ()
