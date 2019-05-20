---json
{
  "title": "Setting up HTTP/2",
  "date": "2016-01-15",
  "socialmediaimage": "h2setup.jpg",
  "live": "true"
}
---

> **Last Update**: 2017-07-12

At [Chrome Dev Summit 2015] I gave [a talk about HTTP/2]. I am genuinely excited about the benefits HTTP/2 brings to the web, to its developers and its users alike. If you don’t know about those, I’ll cheekily recommend my own talk – this post is more of a follow-up to the talk.

<!--more-->

A few months have passed since that talk and the landscape keeps maturing and developing. The biggest perceived barriers to getting HTTP/2 set up are obtaining a HTTPS certificate and the lacking server-side support. This blog post is supposed to give you an overview of how to overcome these barriers categorized by the server technology you use. Keep in mind that the steps provided here cover the bare minimum to get HTTP/2 working. I will not cover [blacklisting weak ciphers] or anything else that I consider out of scope. If you need a kickstart on HTTPS, let me recommend [@addyosmani]’s and [@gauntface]’s [episode of “Totally Tooling Tips”][https-ttt].

## Generic Solution – CloudFlare

Before I go into detail with all the different webservers, you can use [CloudFlare] to get HTTP/2 which out touching your backend at all. CloudFlare have enabled support for HTTP/2 a while ago. Since CloudFlare works as a caching proxy *in front* of your infrastructure, it doesn’t care about your actual server technology, complexity or topology. In my opinion, this is currently the easiest way to get HTTP/2 while still reaping *most* of the benefits. In April 2016, CloudFlare even [added support for HTTP/2 push][Cloudflare Push].

The downside of enabling HTTP/2 via CloudFlare and not on your servers themselves means data saved due to things like HPACK won’t make it to your server, but only to CloudFlare’s proxy.

## Getting a SSL certificate – CertBot

### Actual certificate with CertBot

[LetsEncrypt] is now public so everyone can get a valid SSL certificate for free that is valid for 3 months and can be renewed indefinitely. The EFF wrote a tool call [CertBot] that integrates with a lot of common webserver like Apache or Nginx and takes care of everything for you. Both re-configuring the webserver as well as obtaining the actual certificate is done automatically and periodically.

### Quickstart

If you just want to test HTTP/2 with any server, you can generate a self-signed certificate as follows:

```
$ openssl req  -nodes -new -x509  -keyout server.key -out server.cert
```

Make sure to use your [FQDN] for “Common Name”. Using a self-signed certificate will cause the browser to give you a warning that you can usually ignore by clicking through a dialog. This is obviously not fit for production.

If you are extraordinarily lazy (as any developer should be), I have uploaded a [certificate] and its [private key] for `localhost`.

## Tools
### SimpleHTTP2Server

For **local development**, setting up a webserver and generating a certificate with OpenSSL is quite tedious. For that purpose (and that purpose only) I wrote a small tool called `simplehttp2server`. It’s a binary that serves the currenty directory using HTTP/2 and even has support for push. You can also use this tool as a shorthand to generate a certificate for `localhost`.

You can grab the binaries from the [release section][simplehttp2 release] of the [GitHub repository][simplehttp2 repo], where you’ll also find the README with more details.

### Curl

I used [curl] to check that all experiments were successful. Make sure your version of `curl` actually supports HTTP/2, as the version that comes with Ubuntu 16.04 does not.

```
$ ~/pkg/curl/bin/curl -V
curl 7.46.0 (x86_64-pc-linux-gnu) libcurl/7.46.0 OpenSSL/1.0.2e zlib/1.2.8 nghttp2/1.6.0
Protocols: dict file ftp ftps gopher http https imap imaps pop3 pop3s rtsp smb smbs smtp smtps telnet tftp
Features: IPv6 Largefile NTLM NTLM_WB SSL libz TLS-SRP HTTP2 UnixSockets
```

Note how `HTTP2` is being listed under “Features”. I resorted to compiling my own version.

### KeyCDN

Alternatively, you can use KeyCDN’s [HTTP/2 test][keycdn h2 test] tool, that visit any URL for you and tell you if HTTP/2 has been set up correctly.

## Servers

### Apache

According to [w3techs.com], [Apache] is still the most used webserver today with over 55% of the websites using it.

For HTTP/2, you need Apache `>= 2.4`. If you are running Ubuntu LTS (16.04), the default apt sources won’t bring you very far. There is a PPA:
```
$ sudo add-apt-repository ppa:ondrej/apache2
$ sudo apt-get update
$ sudo apt-get upgrade
```

Most likely, though, you will have to `apt dist-upgrade`, which can be dangerous. Proceed with care.

Next, enable the HTTP2 mod and all the mods it depends on:

```
$ cd /etc/apache2/mods-enabled
$ sudo ln -sf ../mods-available/socache_shmcb.* .
$ sudo ln -sf ../mods-available/ssl.* .
$ sudo ln -sf ../mods-available/http2.* .
```

If you already have a `VirtualHost` for HTTPS, skip this step. Otherwise, edit the file containg your `VirtualHost` and add copy of your original said `VirtualHost` on port 443:
```
<VirtualHost *:443>
  # ...
  # Copy from the original virtual host
  # ...
  SSLEngine On
  SSLCertificateFile /path/to/server.cert
  SSLCertificateKeyFile /path/to/server.key
</VirtualHost>
```

Restart Apache and check that everything is working:

```
$ ~/pkg/curl/bin/curl -I -k --http2 https://localhost
HTTP/2.0 200
date:Thu, 14 Jan 2016 17:58:30 GMT
server:Apache/2.4.18 (Ubuntu)
last-modified:Thu, 14 Jan 2016 14:38:42 GMT
etag:"1-5294c3e4c243a"
accept-ranges:bytes
content-length:1
content-type:text/html
```

### nginx

You need [nginx] `>= 1.9.5`. Luckily, `1.9.15` is distributed with Ubuntu 16.04 LTS.

Open your website’s configuration and either add or modify the section for HTTPS.

```
server {
    listen 443 ssl http2 default_server;
    ssl_certificate    /path/to/server.cert;
    ssl_certificate_key /path/to/server.key;
    # ...
    # Copy from the HTTP server
    # ...
}
```

Restart nginx and check that everything is working:

```
$ ~/pkg/curl/bin/curl -I -k --http2 https://localhost
HTTP/2.0 200
server:nginx/1.9.9
date:Thu, 14 Jan 2016 17:58:04 GMT
content-type:text/html
content-length:612
last-modified:Wed, 09 Dec 2015 15:34:44 GMT
etag:"56684a14-264"
accept-ranges:bytes
```

### Caddy

[Caddy’s][Caddy] whole purpose is to have HTTP/2 support from the very start. Let’s Encrypt-support is built in so you don‘t need to worry about anything. Their landing-page contains an up-to-date setup guide.

### Jetty

You need [Jetty] >= 9.3.

A simple command activates the Jetty’s HTTP/2 module:

```
$ java -jar $JETTY_HOME/start.jar --add-to-startd=http2
```

Start Jetty and check that everything is working:

```
$ ~/pkg/curl/bin/curl -I -k --http2 https://localhost:8443
HTTP/2.0 404
server:Jetty(9.3.6.v20151106)
cache-control:must-revalidate,no-cache,no-store
content-type:text/html;charset=iso-8859-1
content-length:316
```

### Tomcat

[Tomcat] >= 9 has support for HTTP/2. Adjust your `conf/server.xml` to match the following

```
<Connector port="8443"
protocol="org.apache.coyote.http11.Http11AprProtocol"
maxThreads="150" SSLEnabled="true">
    <UpgradeProtocol className="org.apache.coyote.http2.Http2Protocol"/>
    <SSLHostConfig honorCipherOrder="false">
    <Certificate certificateKeyFile="conf/ca.key"
        certificateFile="conf/ca.crt"/>
    </SSLHostConfig>
</Connector>
```

[Source][tomcat source]

### HAProxy

No HTTP/2 support just yet :(

> *Update from Novemeber 2016*:  I thought I would have H2 in 1.6 if you remember :-) So let's say that we'll put a lot of efforts into getting H2 in 1.8. [Source][haproxy source]

### AWS

AWS added support for HTTP/2 to CloudFront. [Source][CloudFront blogpost]

AWS also launched the Certificate Manager that is capable of generating certificates for free. These certificates can be used with CloudFront. [Source][CertManager announcement]

### Google Cloud Storage

If you use a non-custom domain you will get HTTP/2 automatically. For custom domains, there is no HTTP/2 support just yet :(

Workaround: Set up your own loadbalancer on GCE using nginx.

### IIS

No stable HTTP/2 support just yet :(

> Windows 10 is now available, and HTTP/2 support is present in Windows 10 and the Server 2016 Technical Preview. [Source][IIS source]

I haven’t found any updates since.

## PaaS

### Heroku

No HTTP/2 support just yet :(

> *Update from June 2017*: HTTP/2 is not currently supported on Heroku although this may change in future. [Source][Heroku source]

### AppEngine

If you use a non-custom domain or have uploaded a TLS certificate for your custom domain, you will get HTTP/2 automatically:

![Dialog for uploading a certificate with Google AppEngine](gaecert.png)

```
$ ~/pkg/curl/bin/curl -I -k --http2 https://deis-test-910.appspot.com
HTTP/2.0 302
location:https://twitter.com/intent/tweet
content-type:text/html; charset=utf-8
date:Fri, 15 Jan 2016 13:09:38 GMT
server:Google Frontend
alternate-protocol:443:quic,p=1
alt-svc:quic=":443"; ma=604800; v="30,29,28,27,26,25"
```

## Languages

### Node
[http2][node-http2] provides an API similar to Node’s standard HTTP server.

```js
var fs = require('fs');
var http2 = require('http2');
var options = {
  key: fs.readFileSync('/path/to/server.key'),
  cert: fs.readFileSync('/path/to/server.cert')
};
http2.createServer(options, function(request, response) {
  response.end('Hello world!');
}).listen(8080);
```

Run the program and check that everything is working:

```
$ ~/pkg/curl/bin/curl -I -k --http2 https://localhost:8080
HTTP/2.0 200
date:Fri, 15 Jan 2016 13:28:50 GMT
```

### Go

You need Go >= 1.6. From that point on, the standard library’s `net/http` package will automatically use HTTP/2 for TLS-enabled servers.

``` go
package main
import (
    "net/http"
    "log"
)
func main() {
    err := http.ListenAndServeTLS(":8080", "/path/to/server.cert", "/path/to/server.key", nil)
    if err != nil {
        log.Fatalf("Error starting webserver: %s", err)
    }
}
```

Run the program and check that everything is working:

```
$ ~/pkg/curl/bin/curl -I -k --http2 https://localhost:8080
HTTP/2.0 404
content-type:text/plain; charset=utf-8
x-content-type-options:nosniff
content-length:19
date:Fri, 15 Jan 2016 14:35:27 GMT
```

If you find mistakes, insufficient information or are missing a software package or language, feel free to [hit me up on Twitter]!

[Chrome Dev Summit 2015]: https://developer.chrome.com/devsummit
[a talk about HTTP/2]: https://www.youtube.com/watch?v=r5oT_2ndjms
[@addyosmani]: https://twitter.com/addyosmani
[@gauntface]: https://twitter.com/gauntface
[https-ttt]: https://www.youtube.com/watch?v=pgBQn_z3zRE
[CloudFlare]: https://www.cloudflare.com/
[FQDN]: https://en.wikipedia.org/wiki/Fully_qualified_domain_name#Example
[Certificate]: https://f.surma.link/server.cert
[private key]: https://f.surma.link/server.key
[LetsEncrypt]: https://letsencrypt.org/2015/12/03/entering-public-beta.html
[curl]: http://curl.haxx.se/
[keycdn h2 test]: https://tools.keycdn.com/http2-test
[w3techs.com]: http://w3techs.com/technologies/overview/web_server/all
[Apache]: https://httpd.apache.org/
[nginx]: https://www.nginx.com/
[Jetty]: http://www.eclipse.org/jetty/
[Tomcat]: http://tomcat.apache.org/
[tomcat source]: https://readlearncode.com/configure-tomcat-9-for-http2/
[IIS source]: http://blogs.iis.net/davidso/http2
[haproxy source]: http://haproxy.formilux.narkive.com/DICXg7vW/announce-haproxy-1-7-dev6#post2
[blacklisting weak ciphers]: https://cipherli.st/
[Nginx installation guide]: http://nginx.org/en/linux_packages.html#mainline
[node-http2]: https://www.npmjs.com/package/http2
[hit me up on Twitter]: https://twitter.com/surmair
[Totally Tooling Minitip]: https://www.youtube.com/watch?v=qx9tHwhjkHs
[simplehttp2 release]: https://github.com/GoogleChrome/simplehttp2server/releases
[simplehttp2 repo]: https://github.com/GoogleChrome/simplehttp2server
[CloudFront blogpost]: https://aws.amazon.com/blogs/aws/new-http2-support-for-cloudfront/
[http2-push-detect]: https://github.com/surma/http2-push-detect
[CloudFlare push]: https://blog.cloudflare.com/announcing-support-for-http-2-server-push-2/
[CertBot]: https://certbot.eff.org/
[Heroku source]: https://kb.heroku.com/does-heroku-have-plans-to-support-http-2
[CertManager announcement]: https://aws.amazon.com/blogs/security/now-available-aws-certificate-manager/
[Caddy]: https://caddyserver.com/
