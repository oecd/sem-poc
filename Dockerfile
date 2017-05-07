FROM ubuntu:zesty

ENV LC_ALL C.UTF-8
ENV LANG C.UTF-8
RUN DEBIAN_FRONTEND=noninteractive apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get -yu install sassc libghc-shake-dev ghc node-typescript python3 python3-click libsaxonb-java default-jre-headless curl pandoc sudo

RUN ln -s /usr/bin/saxonb-xslt /usr/bin/saxon8

# on ubuntu LTS, substitute sassc package with ruby-sass and add
# RUN ln -s /usr/bin/sass /usr/bin/sassc

RUN useradd ubuntu -G sudo

EXPOSE 8000
VOLUME ["/src"]
USER ubuntu
WORKDIR /src

#RUN pwd
#RUN ["./build.sh", "-j"]
#CMD ./server.sh 0.0.0.0
