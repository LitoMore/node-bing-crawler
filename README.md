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

Config your UpYun account in `config.json`

```
{
  "upyun_bucket_name": "bucket_name",
  "upyun_operator_name": "operator_name",
  "upyun_operator_pwd": "operator_pwd",
  "local_path": "/images/",
  "upyun_path": "/node_images/"
}
```

Run `index.js`

```
$ node index.js
```

Done!
