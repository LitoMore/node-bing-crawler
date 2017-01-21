# node-bing-crawler

bing crawler by Node.js

## Usage

Clone this project and install packages

```
$ git clone https://github.com/LitoMore/node-bing-crawler.git
$ cd node-bing-crawler
$ npm install
```

Create the config file

```
$ cp config.json.example config.json
```

Config your MSS, UpYun and Qiniu account in `config.json`

```
{
  "LOCAL_PATH": "/images/",

  "MSS_ENABLE": false,
  "MSS_BUCKET": "bucket",
  "MSS_ACCESS_KEY": "access_key",
  "MSS_SECRET_KEY": "secret_key",
  "MSS_DOMAIN": "http://your_domain.com",

  "UPYUN_ENABLE": false,
  "UPYUN_BUCKET_NAME": "bucket_name",
  "UPYUN_OPERATOR_NAME": "operator_name",
  "UPYUN_OPERATOR_PWD": "operator_pwd",
  "UPYUN_PATH": "/node_images/",

  "QINIU_ENABLE": false,
  "QINIU_BUCKET": "bucket",
  "QINIU_ACCESS_KEY": "access_key",
  "QINIU_SECRET_KEY": "secret_key"，
  "QINIU_PATH": "/node_images/"
}
```

Run `index.js`

```
$ node index.js
```

Done!
