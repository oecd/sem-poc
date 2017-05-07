# Semantic POC by 67Bricks for OECD

First of all, have a look at the official documentation in the `/doc` folder, it's just one PDF but it contains interesting details about the POC.  One of them is that the POC was built inside a Docker container.

Once you have forked and pulled the code, you should run 

```
docker build -t oecd-poc:latest .
```

This will generate the docker image. Obviously, you'll need to have Docker installed beforehand. Now you have an image that's called `oecd-poc` (I called mine `sem-poc` but it doesn't really matter).  Next, you'll want to start the Docker image, like this:

```
docker run --name oecd-poc --volume `pwd`:/src -p 127.0.0.1:9090:8000 -ti oecd-poc:latest
```

which will expose the container's port `8000` as port `9090` on the host OS. It will also open a shell in the `/src` directory which is where you'll need to do the following work.  At this point, you need to build the actual HTML files etc., like so:

```
./build.sh -j
```

This runs Haskell build file `Build.hs` (which is interesting in itself) to regenerate all resources.  Once this has finished you can finally run the server to look at the site in your browser:

```
./server.sh 0.0.0.0
```

So you can now go and open `http://localhost:9090` in your browser to view the site.

-------

To make the site visible directly from the code repository on Github, I enabled "Github Pages" on the repository's settings page, and executed the following command whenever there was a change that impacted the output.  The full site actually lives in `_build/html`.

```
$ git subtree push --prefix _build/html origin gh-pages
```
This will push the subtree `_build/html` to the branch `gh-pages` which is automatically recognised by Github and, if enabled, will publish the pages at https://oecd.github.io/sem-poc/  (gleaned from here: https://gist.github.com/cobyism/4730490).

I had to modify the `xsl/issue.xsl`, the `assets/eco-outlook.html` and the `assets/growth.html` files because originally, their "home" link is back to `/` but in the Github Pages scenario, our root is `/sem-poc/`. Which means the site will _not_ run as-is inside the Docker container.  I mean it will run but certain links will 404.

